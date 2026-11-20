import { arbitrate, frameFields, parseIdentifier, solveBitTiming } from './can-model.mjs';

function node(tag, value) {
  const element = document.createElement(tag);
  element.textContent = value;
  return element;
}

function table(caption, headers, rows) {
  const element = document.createElement('table');
  element.className = 'bus-table';
  element.createCaption().textContent = caption;
  const header = element.createTHead().insertRow();
  for (const value of headers) {
    const heading = node('th', value);
    heading.scope = 'col';
    header.append(heading);
  }
  const body = element.createTBody();
  for (const [first, ...rest] of rows) {
    const row = body.insertRow();
    const heading = node('th', first);
    heading.scope = 'row';
    row.append(heading);
    for (const value of rest) row.append(node('td', value));
  }
  return element;
}

const frameInput = (data, prefix = '') => {
  const key = name => prefix ? prefix + name[0].toUpperCase() + name.slice(1) : name;
  return { id: data.get(key('id')), width: Number(data.get(key('width'))), type: data.get(key('type')) };
};

const render = {
  timing(data, result) {
    const input = Object.fromEntries([...data].map(([name, value]) => [name, Number(value)]));
    const timings = solveBitTiming(input);
    if (!timings.length) {
      result.append(node('p', 'No candidate satisfies these segment and SJW constraints.'));
      return;
    }
    const rows = timings.map(timing => [
      timing.brp, timing.tqNs.toFixed(3), timing.total, timing.tseg1, timing.tseg2, timing.sjw,
      timing.actualBitrate.toFixed(3), timing.bitrateError.toFixed(4), timing.sample.toFixed(3), timing.sampleError.toFixed(3),
    ]);
    result.append(table('Timing candidates', [
      'Prescaler', 'Quantum (ns)', 'Bit (tq)', 'TSEG1 (tq)', 'TSEG2 (tq)', 'SJW (tq)',
      'Bitrate (bit/s)', 'Bitrate error (%)', 'Sample point (%)', 'Sample error (pp)',
    ], rows));
  },
  arbitration(data, result) {
    const { winner, label, trace } = arbitrate(frameInput(data, 'a'), frameInput(data, 'b'));
    result.append(node('p', winner ? `Contender ${winner} wins at ${label}.` : 'Both contenders sent the same arbitration bits. Neither yields during arbitration.'));
    result.append(table('Logical arbitration bits, from first bit to decision', ['Field', 'A', 'B', 'Bus'],
      trace.map(({ label, a, b, bus }) => [label, a, b, bus])));
  },
  frame(data, result) {
    const { fields } = frameFields({
      ...frameInput(data),
      dlc: Number(data.get('dlc')),
      brs: data.has('brs'),
      esi: data.has('esi'),
    });
    result.append(table('Logical frame layout', ['Field', 'Value or width', 'Purpose'],
      fields.map(({ name, value, purpose }) => [name, value, purpose])));
  },
  identifier(data, result) {
    const id = parseIdentifier(data.get('id'), Number(data.get('width')));
    const rows = [['Format', id.width === 11 ? 'Base' : 'Extended'], ['Hexadecimal', id.hex],
      ['Decimal', id.id], ['Binary', id.bits], ['Leading 11 bits', id.base]];
    if (id.extension) rows.push(['Lower 18 bits', id.extension]);
    result.append(table('Identifier representation', ['Property', 'Value'], rows));
  },
};

for (const form of document.querySelectorAll('form[data-can-tool]')) {
  const result = form.querySelector('.bus-result');
  const updateScroll = () => {
    if (result.scrollWidth > result.clientWidth + 1) result.tabIndex = 0;
    else result.removeAttribute('tabindex');
  };
  const observer = new ResizeObserver(updateScroll);
  observer.observe(result);
  const update = () => {
    result.replaceChildren();
    try {
      render[form.dataset.canTool](new FormData(form), result);
    } catch (error) {
      result.append(node('p', error.message));
    }
    updateScroll();
  };
  form.addEventListener('submit', event => {
    event.preventDefault();
    update();
  });
  update();
}
