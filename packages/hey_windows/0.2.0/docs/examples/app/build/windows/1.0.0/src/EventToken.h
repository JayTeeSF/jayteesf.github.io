/* mingw-w64 ships this header in lower case; WebView2.h asks for it in
 * mixed case, which only a case-insensitive file system forgives. On such a
 * file system this shim IS eventtoken.h to the preprocessor, so it must step
 * past itself to reach the real one. */
#include_next <eventtoken.h>
