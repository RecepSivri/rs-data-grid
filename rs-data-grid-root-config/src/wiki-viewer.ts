// "Wiki" view for the Demo/Code/Wiki tab strip -- a per-framework reference
// page explaining every prop, organized to mirror the sidebar's own
// accordion sections (Data Management / Grid Mode / Appearance / Pagination
// / Toolbar Features) so a reader can match what they see in the sidebar to
// what it actually does.
import { FRAMEWORK_WIKI_META, WIKI_SECTIONS, propSyntax, FrameworkKey } from './wiki-content';

const FRAMEWORK_KEYS: Record<string, FrameworkKey> = {
  '#/react': 'react',
  '#/angular': 'angular',
  '#/vue': 'vue',
  '#/vanilla': 'vanilla',
  '#/jquery': 'jquery',
};

export function renderWiki(container: HTMLElement, tabHash: string): void {
  const framework = FRAMEWORK_KEYS[tabHash];
  container.innerHTML = '';
  if (!framework) {
    return;
  }

  const meta = FRAMEWORK_WIKI_META[framework];
  const wrapper = document.createElement('div');
  wrapper.className = 'wiki-inner';

  const header = document.createElement('div');
  header.className = 'wiki-header';
  const title = document.createElement('h2');
  title.className = 'wiki-title';
  title.textContent = `${meta.displayName} -- rs-data-grid`;
  header.appendChild(title);

  const install = document.createElement('pre');
  install.className = 'wiki-install';
  install.textContent = meta.install;
  header.appendChild(install);

  const npmLink = document.createElement('a');
  npmLink.className = 'wiki-npm-link';
  npmLink.href = meta.npmUrl;
  npmLink.target = '_blank';
  npmLink.rel = 'noopener noreferrer';
  npmLink.textContent = `npm: ${meta.npmPackage}`;
  header.appendChild(npmLink);

  if (meta.peerNote) {
    const note = document.createElement('p');
    note.className = 'wiki-peer-note';
    note.textContent = meta.peerNote;
    header.appendChild(note);
  }
  wrapper.appendChild(header);

  for (const section of WIKI_SECTIONS) {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'wiki-section';

    const sectionTitle = document.createElement('h3');
    sectionTitle.className = 'wiki-section-title';
    sectionTitle.textContent = section.title;
    sectionEl.appendChild(sectionTitle);

    const intro = document.createElement('p');
    intro.className = 'wiki-section-intro';
    intro.textContent = section.intro;
    sectionEl.appendChild(intro);

    const table = document.createElement('table');
    table.className = 'wiki-prop-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Prop</th><th>Type</th><th>Description</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const prop of section.props) {
      const row = document.createElement('tr');

      const propCell = document.createElement('td');
      const code = document.createElement('code');
      code.className = 'wiki-prop-syntax';
      code.textContent = propSyntax(framework, prop.key);
      propCell.appendChild(code);
      row.appendChild(propCell);

      const typeCell = document.createElement('td');
      const typeCode = document.createElement('code');
      typeCode.className = 'wiki-prop-type';
      typeCode.textContent = prop.type;
      typeCell.appendChild(typeCode);
      row.appendChild(typeCell);

      const descCell = document.createElement('td');
      descCell.textContent = prop.description;
      row.appendChild(descCell);

      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    sectionEl.appendChild(table);
    wrapper.appendChild(sectionEl);
  }

  container.appendChild(wrapper);
}
