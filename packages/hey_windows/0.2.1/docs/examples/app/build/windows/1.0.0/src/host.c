/*
 * hey_windows host: ONE Win32 window that shows a Hey web application through
 * Microsoft Edge WebView2. Its own window, its own taskbar entry, never a
 * browser tab (owner, 2026-11-10: "opening another chrome tab is a nightmare").
 *
 * WHAT IS HEY AND WHAT IS NOT. Hey cannot run on Windows yet (its runtime
 * platform surface is unported), so nothing in this executable is Hey code. The
 * Hey part of the package runs on the BUILD HOST: tools/hey_windows_manifest.hey
 * validates the application manifest and writes app_manifest.h, which this
 * file compiles in. That is the same shape as hey_ios, whose screens are
 * described at build time and drawn by a native host.
 *
 * BUILT WITHOUT WINDOWS. mingw-w64 cross-compiles this file on Linux or macOS
 * (bin/build-exe, in the tools/winbox container). The window, its size, title,
 * minimum size, and the receipt it writes are smoke-tested under Wine
 * (bin/wine-smoke). WebView2 itself does not exist under Wine, so the browser
 * part is verified on a real PC; the receipt says which of the two happened.
 *
 * COM IN C. WebView2 is COM. The two completion handlers below are plain
 * structs whose first member is a vtable, exactly what the C declarations in
 * WebView2.h (CINTERFACE + COBJMACROS) expect. No C++ runtime is needed, which
 * keeps the executable one file plus WebView2Loader.dll.
 */
#define COBJMACROS
#define CINTERFACE
#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif
#include <windows.h>
#include <shlobj.h>
#include <stdio.h>
#include <string.h>
#include <wchar.h>
#include "WebView2.h"
#include "app_manifest.h"

/* IIDs the handlers answer to. Local copies, so the executable does not depend
 * on a uuid library: IUnknown, and the two WebView2 handler interfaces
 * (MIDL_INTERFACE strings in WebView2.h). */
static const GUID HW_IID_IUnknown = {0x00000000, 0x0000, 0x0000, {0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46}};
static const GUID HW_IID_EnvHandler = {0x4e8a3389, 0xc9d8, 0x4bd2, {0xb6, 0xb5, 0x12, 0x4f, 0xee, 0x6c, 0xc1, 0x4d}};
static const GUID HW_IID_ControllerHandler = {0x6c4819f3, 0xc9b7, 0x4260, {0x81, 0x27, 0xc9, 0xf5, 0xbd, 0xe7, 0xf6, 0x8c}};

typedef HRESULT (STDAPICALLTYPE *HwCreateEnvironmentFn)(PCWSTR, PCWSTR, ICoreWebView2EnvironmentOptions *, ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler *);

/* The whole state of the one window. */
static HWND hw_window = NULL;
static ICoreWebView2Controller *hw_controller = NULL;
static ICoreWebView2 *hw_webview = NULL;
static HMODULE hw_loader = NULL;
/* starting | ready | absent */
static const wchar_t *hw_state = L"starting";
static wchar_t hw_reason[256] = L"";
static wchar_t hw_user_data[MAX_PATH] = L"";
/* Sizes in app_manifest.h are at 100% scale (96 dots per inch). The embedded
 * application manifest makes the program per-monitor DPI aware (sharp text),
 * so every size is scaled to the monitor the window is on. */
static int hw_dpi = 96;
static int hw_scale(int v) { return MulDiv(v, hw_dpi, 96); }

static void hw_set_absent(const wchar_t *reason, HRESULT code) {
  hw_state = L"absent";
  if (code == S_OK) {
    _snwprintf(hw_reason, 255, L"%ls", reason);
  } else {
    _snwprintf(hw_reason, 255, L"%ls (0x%08lx)", reason, (unsigned long)code);
  }
  hw_reason[255] = 0;
  if (hw_window) InvalidateRect(hw_window, NULL, TRUE);
}

static void hw_fit_webview(void) {
  RECT bounds;
  if (!hw_controller || !hw_window) return;
  GetClientRect(hw_window, &bounds);
  ICoreWebView2Controller_put_Bounds(hw_controller, bounds);
}

/* ---- the controller handler: the browser exists, show the application ---- */
typedef struct {
  ICoreWebView2CreateCoreWebView2ControllerCompletedHandlerVtbl *lpVtbl;
  LONG refs;
} HwControllerHandler;

static HRESULT STDMETHODCALLTYPE hw_ctrl_QueryInterface(ICoreWebView2CreateCoreWebView2ControllerCompletedHandler *self, REFIID riid, void **out) {
  if (!out) return E_POINTER;
  if (IsEqualGUID(riid, &HW_IID_IUnknown) || IsEqualGUID(riid, &HW_IID_ControllerHandler)) {
    *out = self;
    self->lpVtbl->AddRef(self);
    return S_OK;
  }
  *out = NULL;
  return E_NOINTERFACE;
}
static ULONG STDMETHODCALLTYPE hw_ctrl_AddRef(ICoreWebView2CreateCoreWebView2ControllerCompletedHandler *self) {
  return (ULONG)InterlockedIncrement(&((HwControllerHandler *)self)->refs);
}
static ULONG STDMETHODCALLTYPE hw_ctrl_Release(ICoreWebView2CreateCoreWebView2ControllerCompletedHandler *self) {
  /* Static lifetime: the handler lives as long as the process. */
  LONG n = InterlockedDecrement(&((HwControllerHandler *)self)->refs);
  return n < 0 ? 0 : (ULONG)n;
}
static HRESULT STDMETHODCALLTYPE hw_ctrl_Invoke(ICoreWebView2CreateCoreWebView2ControllerCompletedHandler *self, HRESULT code, ICoreWebView2Controller *controller) {
  (void)self;
  if (FAILED(code) || !controller) {
    hw_set_absent(L"the browser control could not be created", code);
    return S_OK;
  }
  hw_controller = controller;
  ICoreWebView2Controller_AddRef(hw_controller);
  if (FAILED(ICoreWebView2Controller_get_CoreWebView2(hw_controller, &hw_webview)) || !hw_webview) {
    hw_set_absent(L"the browser control has no web view", S_OK);
    return S_OK;
  }
  hw_fit_webview();
  ICoreWebView2Controller_put_IsVisible(hw_controller, TRUE);
  ICoreWebView2_Navigate(hw_webview, HW_ORIGIN);
  hw_state = L"ready";
  InvalidateRect(hw_window, NULL, TRUE);
  return S_OK;
}
static ICoreWebView2CreateCoreWebView2ControllerCompletedHandlerVtbl hw_ctrl_vtbl = {
  hw_ctrl_QueryInterface, hw_ctrl_AddRef, hw_ctrl_Release, hw_ctrl_Invoke
};
static HwControllerHandler hw_ctrl_handler = {&hw_ctrl_vtbl, 1};

/* ---- the environment handler: the runtime exists, ask for a controller ---- */
typedef struct {
  ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandlerVtbl *lpVtbl;
  LONG refs;
} HwEnvHandler;

static HRESULT STDMETHODCALLTYPE hw_env_QueryInterface(ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler *self, REFIID riid, void **out) {
  if (!out) return E_POINTER;
  if (IsEqualGUID(riid, &HW_IID_IUnknown) || IsEqualGUID(riid, &HW_IID_EnvHandler)) {
    *out = self;
    self->lpVtbl->AddRef(self);
    return S_OK;
  }
  *out = NULL;
  return E_NOINTERFACE;
}
static ULONG STDMETHODCALLTYPE hw_env_AddRef(ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler *self) {
  return (ULONG)InterlockedIncrement(&((HwEnvHandler *)self)->refs);
}
static ULONG STDMETHODCALLTYPE hw_env_Release(ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler *self) {
  LONG n = InterlockedDecrement(&((HwEnvHandler *)self)->refs);
  return n < 0 ? 0 : (ULONG)n;
}
static HRESULT STDMETHODCALLTYPE hw_env_Invoke(ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler *self, HRESULT code, ICoreWebView2Environment *env) {
  (void)self;
  if (FAILED(code) || !env) {
    hw_set_absent(L"the WebView2 runtime did not start", code);
    return S_OK;
  }
  HRESULT asked = ICoreWebView2Environment_CreateCoreWebView2Controller(env, hw_window, (ICoreWebView2CreateCoreWebView2ControllerCompletedHandler *)&hw_ctrl_handler);
  if (FAILED(asked)) hw_set_absent(L"the browser control was refused", asked);
  return S_OK;
}
static ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandlerVtbl hw_env_vtbl = {
  hw_env_QueryInterface, hw_env_AddRef, hw_env_Release, hw_env_Invoke
};
static HwEnvHandler hw_env_handler = {&hw_env_vtbl, 1};

/* ---- starting the browser ------------------------------------------------- */
/* %LOCALAPPDATA%\<folder>: cookies and the signed-in session live here, so the
 * window opens signed in next time, like the phone. */
static BOOL hw_user_data_folder(void) {
  wchar_t base[MAX_PATH];
  if (FAILED(SHGetFolderPathW(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, base))) return FALSE;
  _snwprintf(hw_user_data, MAX_PATH - 1, L"%ls\\%ls", base, HW_USER_DATA);
  hw_user_data[MAX_PATH - 1] = 0;
  CreateDirectoryW(hw_user_data, NULL);
  return TRUE;
}

/* WebView2Loader.dll beside the executable, never from PATH: a DLL found by
 * name in a working directory is how a Windows program gets hijacked. */
static HMODULE hw_load_loader(void) {
  wchar_t path[MAX_PATH];
  DWORD n = GetModuleFileNameW(NULL, path, MAX_PATH);
  if (n == 0 || n >= MAX_PATH) return NULL;
  wchar_t *slash = wcsrchr(path, L'\\');
  if (!slash) return NULL;
  slash[1] = 0;
  if (wcslen(path) + wcslen(L"WebView2Loader.dll") >= MAX_PATH) return NULL;
  wcscat(path, L"WebView2Loader.dll");
  return LoadLibraryExW(path, NULL, LOAD_WITH_ALTERED_SEARCH_PATH);
}

static void hw_start_browser(void) {
  hw_loader = hw_load_loader();
  if (!hw_loader) {
    hw_set_absent(L"WebView2Loader.dll is not beside the program", S_OK);
    return;
  }
  HwCreateEnvironmentFn create = (HwCreateEnvironmentFn)(void *)GetProcAddress(hw_loader, "CreateCoreWebView2EnvironmentWithOptions");
  if (!create) {
    hw_set_absent(L"WebView2Loader.dll has no CreateCoreWebView2EnvironmentWithOptions", S_OK);
    return;
  }
  if (!hw_user_data_folder()) {
    hw_set_absent(L"no local application data folder", S_OK);
    return;
  }
  HRESULT asked = create(NULL, hw_user_data, NULL, (ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler *)&hw_env_handler);
  if (FAILED(asked)) {
    /* The usual code when the Evergreen runtime is not installed. */
    hw_set_absent(L"the Microsoft Edge WebView2 runtime is not installed", asked);
  }
}

/* ---- the window ------------------------------------------------------------ */
static void hw_paint(HWND window) {
  PAINTSTRUCT ps;
  HDC dc = BeginPaint(window, &ps);
  RECT area;
  GetClientRect(window, &area);
  FillRect(dc, &area, (HBRUSH)(COLOR_WINDOW + 1));
  if (wcscmp(hw_state, L"ready") != 0) {
    wchar_t text[700];
    if (wcscmp(hw_state, L"starting") == 0) {
      _snwprintf(text, 699, L"%ls\n\nOpening %ls", HW_TITLE, HW_ORIGIN);
    } else {
      _snwprintf(text, 699,
        L"%ls\n\n%ls cannot show the application yet:\n%ls\n\n"
        L"Install the Microsoft Edge WebView2 runtime (Evergreen) from\n"
        L"https://developer.microsoft.com/microsoft-edge/webview2/\n"
        L"then open %ls again.",
        HW_TITLE, HW_TITLE, hw_reason, HW_TITLE);
    }
    text[699] = 0;
    SetBkMode(dc, TRANSPARENT);
    SetTextColor(dc, GetSysColor(COLOR_WINDOWTEXT));
    RECT inset = area;
    InflateRect(&inset, -24, -24);
    DrawTextW(dc, text, -1, &inset, DT_LEFT | DT_TOP | DT_WORDBREAK | DT_NOPREFIX);
  }
  EndPaint(window, &ps);
}

static LRESULT CALLBACK hw_window_proc(HWND window, UINT message, WPARAM w, LPARAM l) {
  switch (message) {
    case WM_SIZE:
      hw_fit_webview();
      return 0;
    case WM_GETMINMAXINFO: {
      MINMAXINFO *info = (MINMAXINFO *)l;
      info->ptMinTrackSize.x = hw_scale(HW_MIN_WIDTH);
      info->ptMinTrackSize.y = hw_scale(HW_MIN_HEIGHT);
      return 0;
    }
    case 0x02E0: { /* WM_DPICHANGED: moved to a monitor with another scale */
      RECT *suggested = (RECT *)l;
      hw_dpi = HIWORD(w);
      SetWindowPos(window, NULL, suggested->left, suggested->top,
                   suggested->right - suggested->left, suggested->bottom - suggested->top,
                   SWP_NOZORDER | SWP_NOACTIVATE);
      return 0;
    }
    case WM_PAINT:
      hw_paint(window);
      return 0;
    case WM_DESTROY:
      PostQuitMessage(0);
      return 0;
    default:
      return DefWindowProcW(window, message, w, l);
  }
}

static HWND hw_create_window(HINSTANCE instance) {
  WNDCLASSW cls;
  memset(&cls, 0, sizeof cls);
  cls.lpfnWndProc = hw_window_proc;
  cls.hInstance = instance;
  cls.lpszClassName = L"hey_windows_host";
  cls.hCursor = LoadCursorW(NULL, (LPCWSTR)IDC_ARROW);
  cls.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
  cls.hIcon = LoadIconW(instance, L"hey_windows_app_icon");
  if (!cls.hIcon) cls.hIcon = LoadIconW(NULL, (LPCWSTR)IDI_APPLICATION);
  if (!RegisterClassW(&cls)) return NULL;
  /* Centred on the primary monitor, clamped to it. */
  HDC screen = GetDC(NULL);
  if (screen) { hw_dpi = GetDeviceCaps(screen, LOGPIXELSX); ReleaseDC(NULL, screen); }
  if (hw_dpi <= 0) hw_dpi = 96;
  int screen_w = GetSystemMetrics(SM_CXSCREEN), screen_h = GetSystemMetrics(SM_CYSCREEN);
  int w = hw_scale(HW_WIDTH) < screen_w ? hw_scale(HW_WIDTH) : screen_w;
  int h = hw_scale(HW_HEIGHT) < screen_h ? hw_scale(HW_HEIGHT) : screen_h;
  int x = (screen_w - w) / 2, y = (screen_h - h) / 2;
  return CreateWindowExW(0, cls.lpszClassName, HW_TITLE, WS_OVERLAPPEDWINDOW, x, y, w, h, NULL, NULL, instance, NULL);
}

/* ---- the self-test receipt -------------------------------------------------- */
/* Written to a file because a windowed program has no console. Every line is
 * key=value, so bin/wine-smoke and a person can both read it. */
static void hw_write_receipt(const wchar_t *path) {
  wchar_t title[256];
  RECT outer;
  GetWindowTextW(hw_window, title, 256);
  GetWindowRect(hw_window, &outer);
  FILE *out = _wfopen(path, L"w, ccs=UTF-8");
  if (!out) return;
  fwprintf(out, L"hey_windows_self_test=ok\n");
  fwprintf(out, L"hey_windows_version=%ls\n", HW_VERSION);
  fwprintf(out, L"hey_windows_title=%ls\n", title);
  /* Reported at 100% scale so it compares with the manifest on any display. */
  fwprintf(out, L"hey_windows_window=%ldx%ld\n", (long)MulDiv(outer.right - outer.left, 96, hw_dpi), (long)MulDiv(outer.bottom - outer.top, 96, hw_dpi));
  fwprintf(out, L"hey_windows_dpi=%d\n", hw_dpi);
  fwprintf(out, L"hey_windows_min=%dx%d\n", HW_MIN_WIDTH, HW_MIN_HEIGHT);
  fwprintf(out, L"hey_windows_origin=%ls\n", HW_ORIGIN);
  fwprintf(out, L"hey_windows_user_data=%ls\n", hw_user_data);
  if (wcscmp(hw_state, L"ready") == 0) {
    fwprintf(out, L"hey_windows_webview2=present\n");
  } else if (wcscmp(hw_state, L"starting") == 0) {
    fwprintf(out, L"hey_windows_webview2=starting\n");
  } else {
    fwprintf(out, L"hey_windows_webview2=absent\nhey_windows_reason=%ls\n", hw_reason);
  }
  fclose(out);
}

static void hw_pump_for(DWORD milliseconds) {
  MSG message;
  DWORD until = GetTickCount() + milliseconds;
  while (GetTickCount() < until) {
    while (PeekMessageW(&message, NULL, 0, 0, PM_REMOVE)) {
      if (message.message == WM_QUIT) return;
      TranslateMessage(&message);
      DispatchMessageW(&message);
    }
    Sleep(15);
  }
}

int WINAPI wWinMain(HINSTANCE instance, HINSTANCE previous, PWSTR command_line, int show) {
  (void)previous; (void)command_line;
  int argc = 0;
  LPWSTR *argv = CommandLineToArgvW(GetCommandLineW(), &argc);
  const wchar_t *receipt = NULL;
  for (int i = 1; argv && i < argc; i++) {
    if (wcscmp(argv[i], L"--self-test") == 0 && i + 1 < argc) receipt = argv[++i];
  }
  CoInitializeEx(NULL, COINIT_APARTMENTTHREADED);
  hw_window = hw_create_window(instance);
  if (!hw_window) return 2;
  ShowWindow(hw_window, show == SW_HIDE ? SW_SHOW : show);
  UpdateWindow(hw_window);
  hw_start_browser();
  if (receipt) {
    /* Long enough for the runtime to answer on a real PC; under Wine the
     * answer is immediate (the loader cannot start a runtime that is not there). */
    hw_pump_for(2500);
    hw_write_receipt(receipt);
    DestroyWindow(hw_window);
    hw_pump_for(100);
    if (argv) LocalFree(argv);
    return 0;
  }
  MSG message;
  while (GetMessageW(&message, NULL, 0, 0) > 0) {
    TranslateMessage(&message);
    DispatchMessageW(&message);
  }
  if (argv) LocalFree(argv);
  return (int)message.wParam;
}
