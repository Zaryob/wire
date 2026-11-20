import { canAnalyzer } from './can-analyzer.mjs';
import { canLabs, canTroubleshooting } from './can-labs.mjs';
import { canReference, canTools } from './can-tools.mjs';

const pages = [
  { id: 'buses', title: 'Bus Atlas', tr: 'Veri Yolu Atlası',
    description: 'Explore CAN frames, analyze captures and reproduce experiments on virtual and physical CAN links.' },
  { id: 'buses/can', title: 'CAN / CAN FD', tr: 'CAN / CAN FD',
    description: 'Classical CAN and ISO CAN FD frame structure, arbitration, CRC, ACK, fault confinement and bit timing.', render: canReference },
  { id: 'buses/can/analyzer', title: 'CAN Capture Analyzer', tr: 'CAN Kayıt Analiz Aracı', nav: 'Analyzer', navTr: 'Analiz aracı',
    description: 'Import candump logs and inspect CAN identifiers, frequency, timing, percentiles and jitter locally.', render: canAnalyzer },
  { id: 'buses/tools', title: 'CAN Tools', tr: 'CAN Araçları', nav: 'Tools', navTr: 'Araçlar',
    description: 'Calculate CAN bit timing, simulate arbitration, inspect frame fields and compare CAN identifiers.', render: canTools },
  { id: 'buses/can/troubleshooting', title: 'CAN Troubleshooting', tr: 'CAN Sorun Giderme', nav: 'Troubleshooting', navTr: 'Sorun giderme',
    description: 'Investigate missing ACK, timing, termination, controller errors, bus-off and capture gaps.', render: canTroubleshooting },
  { id: 'buses/can/labs', title: 'CAN Laboratories', tr: 'CAN Laboratuvarları', nav: 'Laboratories', navTr: 'Laboratuvarlar',
    description: 'Reproduce vcan, candump and SocketCAN examples and bring up a Raspberry Pi MCP2515 bench.', render: canLabs },
];

const protocolInventory = ['I²C', 'SPI', 'UART', 'LIN', 'RS-485', 'MIL-STD-1553'];

const summariesTr = [
  'Klasik CAN ve ISO CAN FD çerçeve alanları, tahkim, CRC, ACK ve bit zamanlaması.',
  'candump kayıtlarını tarayıcıda inceleyin. Kimlikleri, mesaj sıklığını ve zamanlama değişimini karşılaştırın.',
  'Bit zamanlamasını hesaplayın, tahkimi canlandırın ve çerçeve alanlarını inceleyin.',
  'ACK, sonlandırma, bit hızı, hata sayaçları ve kayıt boşluklarını araştırın.',
  'vcan ve SocketCAN deneylerinden Raspberry Pi ile MCP2515 deneme düzeneğine geçin.',
];

export const busIds = pages.map(page => page.id);

function overview(href, isTr) {
  return `<p class="bus-lead">${isTr
    ? 'Klasik CAN ve CAN FD çerçevelerini inceleyin, kayıtları tarayıcıda çözümleyin ve Linux üzerinde deneyler yapın.'
    : 'Read Classical CAN and CAN FD frames, measure intervals in a capture, and reproduce the same observations with SocketCAN.'}</p>
<section aria-labelledby="can-workspace-title">
  <h2 id="can-workspace-title">${isTr ? 'CAN çalışma alanı' : 'Explore CAN'}</h2>
  <ul class="bus-cards">${pages.slice(1).map((page, index) => `<li><a href="${href(page.id)}"><strong>${isTr ? page.tr : page.title}</strong><span>${isTr ? summariesTr[index] : page.description}</span></a></li>`).join('')}</ul>
</section>
<section aria-labelledby="bus-inventory-title">
  <h2 id="bus-inventory-title">${isTr ? 'Atlas kapsamı' : 'Atlas coverage'}</h2>
  <p>${isTr ? 'Yayında CAN ve CAN FD var. Diğer veri yolları, başvuru ve deneyler hazır olduğunda eklenecek.' : 'CAN and CAN FD are available. The following buses are planned.'}</p>
  <ul class="bus-inventory">${protocolInventory.map(name => `<li>${name}</li>`).join('')}</ul>
</section>`;
}

export function busPage(id, lang, url, asset) {
  const page = pages.find(candidate => candidate.id === id);
  const isTr = lang === 'tr';
  const title = isTr ? page.tr : page.title;
  const href = (target, fragment) => url(target, lang) + (fragment ? '#' + fragment : '');
  const description = isTr ? (page.render ? summariesTr[pages.indexOf(page) - 1] : 'CAN çerçeve başvurusu, kayıt analizi, etkileşimli araçlar ve SocketCAN deneyleri.') : page.description;
  const nav = pages.map(item => `<li><a href="${href(item.id)}"${item === page ? ' aria-current="page"' : ''}>${isTr ? item.navTr ?? item.tr : item.nav ?? item.title}</a></li>`).join('');
  const content = page.render ? page.render({ href, asset, lang }) : overview(href, isTr);
  return { id, title, description, lang, className: 'bus-atlas', stylesheet: 'bus-atlas/buses.css', body: `
    <header class="bus-heading">
      <a class="bus-back" href="${href('')}"><span aria-hidden="true">←</span> ${isTr ? 'Wire protokolleri' : 'Wire protocols'}</a>
      <h1>${title}</h1>
    </header>
    ${page.render ? `<nav class="bus-nav" aria-label="${isTr ? 'Veri Yolu Atlası' : 'Bus Atlas'}"><ul>${nav}</ul></nav>` : ''}
    ${isTr && page.render ? '<p class="bus-hint">Bu sayfanın teknik içeriği İngilizcedir.</p>' : ''}
    <div${isTr && page.render ? ' lang="en"' : ''} class="bus-content">${content}</div>` };
}

export const busSearch = ['en', 'tr'].flatMap(lang => pages.map((page, index) => ({
  title: lang === 'tr' ? page.tr : page.title,
  description: lang === 'tr' && index ? summariesTr[index - 1] : page.description,
  text: page.description,
  url: `${lang === 'tr' ? 'tr/' : ''}${page.id}/`,
  type: 'wire/',
  lang,
})));
