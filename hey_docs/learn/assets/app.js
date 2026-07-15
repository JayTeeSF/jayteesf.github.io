(() => {
  'use strict';

  const source = document.querySelector('#source');
  const output = document.querySelector('#output');
  const diagnostics = document.querySelector('#diagnostics');
  const status = document.querySelector('#runner-status');
  const quota = document.querySelector('#quota-summary');
  const runButton = document.querySelector('#run-button');
  const shareButton = document.querySelector('#share-button');
  let catalog = { examples: [], challenges: [], profile: {} };

  function encodeSource(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  }

  function decodeSource(value) {
    const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((value.length + 3) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function setView(name) {
    document.querySelectorAll('.view').forEach((view) => view.classList.remove('is-active'));
    document.querySelectorAll('.nav-button').forEach((button) => button.classList.remove('is-active'));
    document.querySelector(`#${name}-view`).classList.add('is-active');
    document.querySelector(`[data-view="${name}"]`).classList.add('is-active');
  }

  function loadSource(item) {
    source.value = item.source;
    localStorage.setItem('hey.learning.last_source', source.value);
    setView('playground');
    source.focus();
  }

  function catalogButton(item, subtitle) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'catalog-item';
    button.innerHTML = `<strong>${item.title}</strong><span>${subtitle}</span>`;
    button.addEventListener('click', () => loadSource(item));
    return button;
  }

  function renderCatalog() {
    const exampleList = document.querySelector('#example-list');
    const challengeList = document.querySelector('#challenge-list');
    const tourList = document.querySelector('#tour-list');
    const challengeCards = document.querySelector('#challenge-cards');
    const profileList = document.querySelector('#profile-list');

    catalog.examples.forEach((item) => {
      exampleList.appendChild(catalogButton(item, item.concepts));
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${item.id}. ${item.title}`;
      button.addEventListener('click', () => loadSource(item));
      li.appendChild(button);
      tourList.appendChild(li);
    });

    catalog.challenges.forEach((item) => {
      challengeList.appendChild(catalogButton(item, `${item.difficulty} · ${item.concepts}`));
      const card = document.createElement('article');
      card.className = 'challenge-card';
      card.innerHTML = `<h3>${item.title}</h3><p>${item.summary}</p><p><strong>Concepts:</strong> ${item.concepts}</p>`;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Open starter';
      button.addEventListener('click', () => loadSource(item));
      card.appendChild(button);
      challengeCards.appendChild(card);
    });

    Object.entries(catalog.profile).forEach(([key, value]) => {
      const li = document.createElement('li');
      li.textContent = `${key.replaceAll('_', ' ')}: ${Array.isArray(value) ? value.join(', ') : value}`;
      profileList.appendChild(li);
    });

    quota.textContent = `${catalog.profile.wall_clock_ms} ms deadline · ${catalog.profile.max_source_bytes} source bytes · ${catalog.profile.max_output_bytes} output bytes`;
  }

  function renderDiagnostics(items) {
    diagnostics.replaceChildren();
    (items || []).forEach((item) => {
      const node = document.createElement('div');
      node.className = 'diagnostic';
      node.textContent = `${item.phase}: ${item.message}`;
      diagnostics.appendChild(node);
    });
  }

  async function run() {
    runButton.disabled = true;
    status.textContent = 'Transpiling and running in this browser…';
    status.className = '';
    output.textContent = '';
    diagnostics.replaceChildren();
    localStorage.setItem('hey.learning.last_source', source.value);
    try {
      const result = await HeyBrowser.execute(source.value, {
        timeoutMs: catalog.profile.wall_clock_ms || 2500,
        workerUrl: 'assets/hey-browser.js'
      });
      output.textContent = [result.stdout || '', result.stderr || ''].filter(Boolean).join('\n');
      renderDiagnostics(result.diagnostics);
      status.textContent = result.ok ? `Completed locally in ${result.elapsed_ms} ms` : `${result.phase || 'run'} failed`;
      status.className = result.ok ? 'success' : 'error';
    } catch (error) {
      output.textContent = '';
      renderDiagnostics([{phase: 'browser-js', message: error.message}]);
      status.textContent = 'Browser transpilation failed';
      status.className = 'error';
    } finally {
      runButton.disabled = false;
    }
  }

  async function share() {
    const url = new URL(window.location.href);
    url.hash = `source=${encodeSource(source.value)}`;
    await navigator.clipboard.writeText(url.toString());
    status.textContent = 'Share link copied. It will load source without executing it.';
  }

  document.querySelectorAll('.nav-button').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });
  runButton.addEventListener('click', run);
  shareButton.addEventListener('click', share);
  source.addEventListener('input', () => localStorage.setItem('hey.learning.last_source', source.value));

  fetch('catalog.json')
    .then((response) => response.json())
    .then((value) => {
      catalog = value;
      renderCatalog();
      const shared = window.location.hash.startsWith('#source=') ? window.location.hash.slice(8) : '';
      if (shared) {
        source.value = decodeSource(shared);
        status.textContent = 'Shared source loaded. Press Run when you are ready.';
      } else {
        source.value = localStorage.getItem('hey.learning.last_source') || catalog.examples[0].source;
      }
    })
    .catch((error) => {
      status.textContent = `Catalog unavailable: ${error.message}`;
      status.className = 'error';
    });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
})();
