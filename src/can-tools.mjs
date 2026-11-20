import { FD_LENGTHS } from '../public/bus-atlas/can-model.mjs';

const source = (url, label) => `<a href="${url}">${label}</a>`;
const classical = source('https://www.can-cia.org/can-knowledge/can-cc', 'CiA Classical CAN');
const fd = source('https://can-cia.org/can-knowledge/can-fd-the-basic-idea', 'CiA CAN FD');
const crc = source('https://www.can-cia.org/can-knowledge/cyclic-redundancy-check-crc-in-can-frames', 'CiA CAN CRC');
const linux = source('https://docs.kernel.org/networking/can.html', 'Linux SocketCAN');
const recommendations = source('https://www.can-cia.org/can-knowledge/cia-601-series-can-fd-guidelines-and-recommendations', 'CiA 601 guidelines');
const bosch20 = source('https://www.canlab.cz/sites/default/files/pages/download/Can2spec.pdf', 'Bosch CAN Specification 2.0');
const bosch = source('https://www.bosch-semiconductors.com/products/ip-modules/can-protocols/can-fd/', 'Bosch CAN FD');
const standard = source('https://www.iso.org/standard/86384.html', 'ISO 11898-1:2024');

export function canReference({ href }) {
  return `<p>Classical CAN and ISO CAN FD carry frames identified by message priority. A transceiver turns the controller’s logic levels into bus states. A dominant 0 overrides a recessive 1 when nodes transmit together. All nodes can observe the frame, and each controller can filter which identifiers it delivers to its application.</p>
<section id="formats"><h2>Frame formats</h2>
<p>Bosch CAN 2.0 Part A describes the 11-bit base format. Part B covers the base and 29-bit extended formats. Extended frames send the leading 11 identifier bits first, then SRR and IDE, then the remaining 18 identifier bits. A Classical data frame carries up to eight bytes. A Classical remote frame uses RTR to request a data frame with the same identifier and carries a requested length in DLC. ISO CAN FD uses FDF to signal the FD format, replaces RTR with dominant RRS and supports data frames up to 64 bytes. ${bosch20}, ${classical}, ${fd}.</p>
<table class="bus-table"><caption>Frame properties</caption><thead><tr><th scope="col">Property</th><th scope="col">Classical CAN</th><th scope="col">ISO CAN FD</th></tr></thead><tbody>
<tr><th scope="row">Identifier</th><td>11 or 29 bits</td><td>11 or 29 bits</td></tr>
<tr><th scope="row">Payload</th><td>0–8 bytes</td><td>0–8, 12, 16, 20, 24, 32, 48 or 64 bytes</td></tr>
<tr><th scope="row">Remote request</th><td>Recessive RTR, no payload</td><td>Unavailable</td></tr>
<tr><th scope="row">Bit timing</th><td>Nominal timing throughout</td><td>Optional data timing between the BRS and CRC delimiter sample points</td></tr>
<tr><th scope="row">CRC sequence</th><td>15 bits</td><td>17 bits through 16 bytes, 21 bits above 16 bytes</td></tr></tbody></table>
<figure class="bus-frame-sequence">
  <figcaption>Logical order on the wire. Blocks group fields by function. Their widths are illustrative.</figcaption>
  <div><strong>Classical CAN</strong><ol><li>SOF</li><li>Identifier and arbitration</li><li>Control and DLC</li><li>Data if present</li><li>CRC-15</li><li>CRC delimiter, ACK and EOF</li></ol></div>
  <div><strong>ISO CAN FD</strong><ol><li>SOF</li><li>Identifier and arbitration</li><li>FDF, BRS, ESI and DLC</li><li>Data if present</li><li>Stuff count, parity and CRC-17/21 with fixed stuff bits</li><li>CRC delimiter, ACK and EOF</li></ol></div>
</figure>
<p>The DLC describes a length or requested length. The application protocol or message database defines payload byte order, signal positions and units.</p>
<p><a href="${href('buses/tools', 'frame-fields')}">Explore frame fields and DLC</a></p></section>
<section id="arbitration"><h2>Arbitration and acknowledgement</h2>
<p>Nodes transmit identifier bits most significant bit first and read back the bus. A contender sending recessive that observes dominant during arbitration yields and can retry later. The lower identifier wins among frames of the same identifier width with different identifiers. For an identical 11-bit prefix, the base frame beats the extended frame at RTR/SRR or IDE. With the same identifier and width, a Classical data frame beats a remote request at RTR. The same arbitration bits leave both nodes transmitting, so unique producer assignments matter. ${classical}.</p>
<p>The transmitter sends recessive in the ACK slot. A receiver that accepts the frame can pull it dominant. This confirms reception at the CAN layer by at least one node. The destination application's handling of the payload requires separate evidence. EOF is seven recessive bits and the minimum intermission before a new data or remote frame is three recessive bits. ${classical}.</p></section>
<section id="integrity"><h2>Stuffing, integrity and error confinement</h2>
<p>In Classical CAN, dynamic stuffing applies from SOF through the CRC sequence. After five consecutive equal bits in that region the transmitter inserts a complementary bit. In FD, dynamic stuffing applies before the CRC field. The ISO FD CRC field has fixed-position stuff bits and a Gray-coded dynamic stuff count modulo eight protected by a parity bit. The CRC delimiter, ACK and EOF follow the CRC sequence and its stuffing. A SocketCAN log shows controller-delivered frame data and optional error reports. A bus trace is needed to inspect actual wire bits, stuffing or ACK behavior. ${crc}, ${linux}. <a href="${href('buses/can/analyzer')}">Inspect a SocketCAN capture</a></p>
<p>Nodes detect bit, stuff, CRC, form and acknowledgment errors. An error-active node signals with six dominant bits in an active error flag. An error-passive node signals with six recessive bits in a passive error flag. Transmit and receive error counters govern state transitions. Either counter reaching 128 makes the node error-passive and a transmit error count above 255 takes it bus-off. A bus-off node stops participating until recovery is allowed by its controller and configuration. Error and overload signaling are distinct from normal data and remote frames. ${classical}.</p></section>
<section id="iso-scope"><h2>ISO and Bosch non-ISO CAN FD</h2>
<p>CAN FD was introduced by Bosch in 2012 and standardized in ISO 11898-1:2015. This page models standardized FD using the data link layer scope of ISO 11898-1:2024. The earlier Bosch format lacks the ISO FD CRC stuff count and has a different CRC field format. Nodes exchanging FD frames must agree on ISO or non-ISO operation. SocketCAN exposes <code>FD-NON-ISO</code> where the driver supports it. A legacy Classical controller can disrupt FD traffic when it detects an FD frame as an error. Bosch CAN FD controllers can also send Classical frames. ${bosch}, ${standard}, ${linux}.</p></section>
<section id="timing"><h2>Bit timing</h2>
<p>A bit starts with a one-quantum synchronization segment. Propagation and phase segment 1 form TSEG1. The sample point follows TSEG1, and phase segment 2 forms TSEG2. The synchronization jump width, SJW, limits how many quanta resynchronization can adjust. When BRS is recessive, an FD frame switches at the BRS sample point and returns to nominal timing at the CRC delimiter sample point. ESI reports the transmitter’s error state, with dominant used by error-active controllers and recessive indicating error-passive operation. ${fd}, ${recommendations}.</p>
<p>Controller clock, prescaler bounds, segment ranges and SJW limits determine which configurations are available. Transceiver delay, wiring, oscillator tolerance and transmitter delay compensation can further limit the workable timing. ${linux}, ${recommendations}.</p>
<p><a href="${href('buses/tools', 'bit-timing')}">Calculate nominal or data bit timing</a></p></section>
<section id="physical-layer"><h2>High-speed CAN physical layer</h2>
<p>Connect the host to the CAN controller through the controller’s host interface. The controller passes TXD and RXD logic signals to the transceiver, which drives and senses the differential CANH/CANL pair. Use a twisted-pair trunk with short stubs and termination matched to the cable at both ends. A common high-speed design uses 120 Ω at each end. Check common-mode range, signal reference, output levels, transceiver standby state and transceiver rating at the required data-phase bitrate.</p>
<p>For the specifications and a bench example, see <a href="https://www.iso.org/standard/90697.html">ISO 11898-2:2026, high-speed PMA</a>, <a href="https://www.can-cia.org/can-knowledge/can-hs-transmission">CiA high-speed transmission</a> and the <a href="${href('buses/can/labs', 'raspberry-pi-mcp2515')}">Classical CAN bench lab</a>.</p></section>`;
}

const idInput = (name, value, label = 'Identifier') => `<label>${label} <input name="${name}" value="${value}" required spellcheck="false"></label>`;
const widthInput = name => `<label>Identifier width <select name="${name}"><option value="11">11-bit base</option><option value="29">29-bit extended</option></select></label>`;
const typeInput = name => `<label>Frame type <select name="${name}"><option value="data">Classical data</option><option value="remote">Classical remote</option><option value="fd">ISO CAN FD data</option></select></label>`;
const numberInput = (name, label, value, min, max, step = 1) => `<label>${label} <input name="${name}" type="number" value="${value}" min="${min}" max="${max}" step="${step}" required></label>`;
const result = '<div class="bus-result" aria-live="polite"></div>';

export function canTools({ href, asset }) {
  return `<p><a href="${href('buses/can')}">Classical CAN and ISO CAN FD reference</a></p>
<section id="bit-timing"><h2>Bit timing calculator</h2>
<p>Run the calculator with the nominal bounds, then use the controller’s data phase bounds for an FD data bitrate. SocketCAN reports the controller clock and timing limits in <code>ip -details link show can0</code>. Prescalers progress in increments from the minimum. Set the controller’s maximum SJW. The calculator checks the requested SJW against that maximum and both timing segments. TSEG1 combines propagation and phase segment 1, so verify that phase segment 1 can accommodate SJW after allocating propagation quanta.</p>
<p>Bitrate = clock ÷ (prescaler × (1 + TSEG1 + TSEG2)). Sample point = (1 + TSEG1) ÷ (1 + TSEG1 + TSEG2). For each feasible total quanta per bit, the calculator tries the nearest prescalers and segment splits. It orders the resulting candidates by absolute bitrate error, then absolute sample-point error, then more quanta per bit. It shows candidates even when the requested bitrate is unattainable. Check timing errors, clock tolerance, propagation, transceiver and driver constraints before applying a candidate. ${linux}, ${recommendations}.</p>
<form class="bus-form" data-can-tool="timing">
${numberInput('clock', 'Controller clock (Hz)', 80000000, 1, 1e9)}
${numberInput('bitrate', 'Target bitrate (bit/s)', 500000, 1, 1e9)}
${numberInput('targetSample', 'Target sample point (%)', 87.5, 0.01, 99.99, 'any')}
${numberInput('sjw', 'SJW (tq)', 1, 1, 1024)}
<fieldset><legend>Controller limits</legend>
${numberInput('brpMin', 'Prescaler minimum', 1, 1, 65536)}
${numberInput('brpMax', 'Prescaler maximum', 512, 1, 65536)}
${numberInput('brpStep', 'Prescaler increment', 1, 1, 65536)}
${numberInput('sjwMax', 'SJW maximum (tq)', 16, 1, 1024)}
${numberInput('tseg1Min', 'TSEG1 minimum (tq)', 2, 1, 1024)}
${numberInput('tseg1Max', 'TSEG1 maximum (tq)', 64, 1, 1024)}
${numberInput('tseg2Min', 'TSEG2 minimum (tq)', 2, 1, 1024)}
${numberInput('tseg2Max', 'TSEG2 maximum (tq)', 16, 1, 1024)}
</fieldset><button type="submit">Calculate timing</button>${result}</form></section>
<section id="arbitration"><h2>Arbitration simulator</h2><p>Compare two contenders starting at the same SOF. The display uses logical bits and omits common stuff bits. Recessive is 1 and dominant is 0. A tie means there is no winner during arbitration. Differences later in the frame can cause errors instead of resolving priority.</p>
<form class="bus-form" data-can-tool="arbitration">
<fieldset><legend>Contender A</legend>${idInput('aId', '0x123')}${widthInput('aWidth')}${typeInput('aType')}</fieldset>
<fieldset><legend>Contender B</legend>${idInput('bId', '0x127')}${widthInput('bWidth')}${typeInput('bType')}</fieldset>
<button type="submit">Simulate arbitration</button>${result}</form></section>
<section id="frame-fields"><h2>Frame field visualizer</h2><p>Inspect the logical field order. The display shows lengths for the data and CRC regions and lists fixed CRC stuff bits as a group. It leaves dynamic stuffing, payload values, CRC calculation and actual ACK observation to a wire trace.</p>
<form class="bus-form" data-can-tool="frame">
${idInput('id', '0x123')}${widthInput('width')}${typeInput('type')}
${numberInput('dlc', 'Data length code (DLC)', 8, 0, 15)}
<label><input type="checkbox" name="brs"> BRS (FD)</label>
<label><input type="checkbox" name="esi"> Recessive ESI (FD)</label>
<button type="submit">Show frame fields</button>${result}</form>
<details><summary>Data length code mapping</summary><table class="bus-table"><caption>Data frame payload bytes by DLC value</caption><thead><tr><th scope="col">DLC</th><th scope="col">Classical CAN</th><th scope="col">CAN FD</th></tr></thead><tbody>${FD_LENGTHS.map((length, i) => `<tr><th scope="row">${i}</th><td>${Math.min(i, 8)}</td><td>${length}</td></tr>`).join('')}</tbody></table></details></section>
<section id="identifiers"><h2>Identifier explorer</h2><p>Use decimal, <code>0x</code> hexadecimal or <code>0b</code> binary. The identifier width determines format even when a 29-bit value fits in 11 bits. An identifier’s meaning is defined by the application protocol or a supplied message database.</p>
<form class="bus-form" data-can-tool="identifier">
${idInput('id', '0x123')}${widthInput('width')}<button type="submit">Inspect identifier</button>${result}</form></section>
<script type="module" src="${asset('bus-atlas/can-tools.mjs')}"></script>`;
}
