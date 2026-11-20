const socketCan = 'https://docs.kernel.org/networking/can.html';
const canUtils = 'https://github.com/linux-can/can-utils';
const physicalLayer = 'https://www.ti.com/lit/an/slla270/slla270.pdf';
const bootConfig = 'https://www.raspberrypi.com/documentation/computers/config_txt.html';
const overlays = 'https://github.com/raspberrypi/firmware/blob/master/boot/overlays/README';
const mcp2515 = 'https://www.microchip.com/en-us/product/MCP2515';
const tracing = 'https://zaryob.github.io/execmap/rehberler/performans-analizine-giris.html';

const code = commands => `<pre><code>${commands.replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char])}</code></pre>`;

export function canTroubleshooting({ href }) {
  return `
<p>Start with the interface state, then check what your capture can see. On physical hardware, do the electrical checks on an isolated bench.</p>
<nav aria-label="Troubleshooting topics"><ul>
<li><a href="#first-capture">Interface and capture</a></li>
<li><a href="#no-ack">Missing ACK</a></li>
<li><a href="#error-states">Error states and bus-off</a></li>
<li><a href="#wiring">Termination, wiring and noise</a></li>
<li><a href="#bit-timing">Bitrate and sample point</a></li>
<li><a href="#periodic-gaps">Periodic gaps and capture loss</a></li>
</ul></nav>
<section id="first-capture">
<h2>Check the interface and capture</h2>
<p>On Linux, identify the intended interface with <code>ip -brief link</code>. Substitute its name for <code>can0</code> in these read-only commands. Record the reported driver and calculated timing, controller state, and available counters before and after the symptom.</p>
${code(`ip -details -statistics link show dev can0
candump -e -d 'can0,0:0,#FFFFFFFF'`)}
<p>The filter admits all data and requests SocketCAN error notifications. <code>-e</code> decodes error details and <code>-d</code> monitors socket drops. Drivers vary in which errors and counters they report. If supported, enable <code>berr-reporting on</code> in the bench interface configuration while the link is down, then bring it back up. A normal running controller usually reports <code>ERROR-ACTIVE</code>. Use the <a href="${href('buses/can/labs', 'error-counters')}">error counters lab</a> to compare snapshots around a known transmission. An empty capture can mean an idle bus, a wrong interface, filtering, or failure to decode frames. See the <a href="${socketCan}">Linux SocketCAN reference</a> and <a href="${canUtils}">can-utils</a>.</p>
</section>
<section id="no-ack">
<h2>Isolate a missing ACK</h2>
<p>On a two-node bench, send one known Classical frame and check for it in a capture on the peer. A receiver in normal mode that accepts the frame at the protocol level drives the ACK slot dominant, even if an application has filtered the ID out. A listen-only node does not ACK. Local SocketCAN echo and a successful socket write establish limited host-side facts. Use the second node's capture or inspect the ACK slot with a scope or physical analyzer to verify the exchange.</p>
<p>If the transmitter reports an ACK error, check for an unpowered peer, standby or silent transceiver, listen-only mode, mismatched nominal timing, swapped conductors, or an FD frame reaching Classical-only equipment. Correct one variable at a time, then repeat the single-frame test. Stop the sender if errors repeat because the controller may retry an unacknowledged frame. ACK establishes reception by at least one node at the link layer. Verify application delivery separately with the <a href="${href('buses/can/labs', 'raspberry-pi-mcp2515')}">two-node bench lab</a>.</p>
</section>
<section id="error-states">
<h2>Distinguish error-passive from bus-off</h2>
<p>Compare <code>berr-counter tx</code> and <code>rx</code>, when exposed by the driver, and the changes in <code>bus-errors</code>, <code>error-pass</code>, and <code>bus-off</code>. Error-passive indicates elevated error counters and the controller can still participate, with passive error signaling. A bus-off controller stops participating. A rising transmit counter points you toward failures while transmitting, but ACK, timing, and electrical faults can look similar in a log. A missing ACK on an otherwise idle bus can leave a transmitter error-passive without pushing it all the way to bus-off.</p>
<p>Stop traffic and fix the cause before recovering. On the isolated bench, with automatic restart disabled, use <code>sudo ip link set dev can0 type can restart</code> after confirming the controller is bus-off and the driver supports manual restart. Recheck state, send one test frame, confirm receipt at the peer, then check that counters stay stable. If the controller returns to bus-off, stop and investigate the physical link and settings. See <a href="${socketCan}">SocketCAN bus-off and restart controls</a> and the <a href="${href('buses/can/labs', 'error-counters')}">counter inspection exercise</a>.</p>
</section>
<section id="wiring">
<h2>Check termination, wiring and noise</h2>
<ol>
<li>Power off the whole bench before measuring resistance. On a standard high-speed trunk with two simple 120 Ω end terminations, CAN_H to CAN_L should read about 60 Ω. Around 120 Ω suggests one effective termination, around 40 Ω suggests three, and a near short or open calls for sectional isolation. Bias networks and unusual termination can change the reading.</li>
<li>Check continuity, H-to-H and L-to-L polarity, and the transceivers' common-mode and reference requirements. Check jumpers for hidden or duplicate terminators. Keep the pair twisted, place termination at the two physical ends, and shorten stubs.</li>
<li>Power up. With appropriate differential probing, compare CAN_H−CAN_L at the endpoints and look for ringing, reduced amplitude or intermittent disturbances. Check the common-mode range against the actual transceiver datasheet. Repeat the same traffic after moving noisy cabling, correcting grounding, or shortening a stub, and compare scope traces and error counters.</li>
</ol>
<p>See <a href="${physicalLayer}">TI's high-speed CAN physical layer application report</a> for topology, termination and signal integrity. The <a href="${href('buses/can/labs', 'raspberry-pi-mcp2515')}">bench lab</a> includes an unpowered resistance check.</p>
</section>
<section id="bit-timing">
<h2>Verify bitrate and sample point</h2>
<p>Compare <code>bitrate</code>, <code>sample_point</code>, <code>tq</code>, segment lengths, <code>sjw</code>, and <code>clock</code> at both nodes. For FD with BRS, also compare <code>dbitrate</code> and data-phase timing and confirm ISO mode. An incorrect module oscillator setting can make the software report the requested bitrate while the waveform uses a different bit duration. Start at a shared known nominal bitrate on a short bench link. When only BRS traffic fails, inspect the data phase and transceiver capabilities first.</p>
<p>Use the <a href="${href('buses/tools')}">bit timing calculator</a> with the actual controller clock and segment limits. Verify the timings the driver actually selected, then check bit duration and settling at the far end. A matching nominal bitrate alone leaves propagation, oscillator tolerance, and sample point to check. The <a href="${href('buses/can/labs', 'raspberry-pi-mcp2515')}">MCP2515 lab</a> shows where the Linux driver gets its controller clock and interrupt settings.</p>
</section>
<section id="periodic-gaps">
<h2>Investigate periodic gaps and capture loss</h2>
<p>Save a timestamped capture and record its interface, timestamp source and any drop counts. In the <a href="${href('buses/can/analyzer')}">capture analyzer</a>, compare timestamps per interface, identifier width, identifier and frame type. An anomalous gap can come from source scheduling, bus access, retransmissions, filtering or loss in the receive path. Inspect socket drops and interface statistics and repeat at a lower sender rate. Compare with an independent capture if possible. A capture interval describes observed arrivals and does not on its own establish missed transmissions or bus utilization.</p>
<p>Use the <a href="${href('buses/can/labs', 'periodicity')}">periodicity lab</a> to establish a virtual baseline before checking physical behavior. For application delays, compare observed intervals with process-side activity using <a href="${tracing}">Execmap's Linux runtime analysis guide</a>.</p>
</section>`;
}

export function canLabs({ href, asset, lang }) {
  const pi4 = `https://zaryob.github.io/pin-atlas/${lang === 'tr' ? 'tr/' : ''}boards/raspberry-pi-4/`;
  return `
<p>SocketCAN exposes CAN controllers as Linux network interfaces. Applications bind an <code>AF_CAN</code> socket to an interface index. A <code>CAN_RAW</code> socket reads or writes controller-level frame objects, with optional receive filters, error reports and FD support. <code>ip</code> configures the interface, while can-utils and the example program below use those sockets for traffic. <a href="${socketCan}">Linux SocketCAN API</a>.</p>
<p>Use a Linux host or Linux VM with <code>iproute2</code> and <code>can-utils</code>. The first three exercises use an explicitly named virtual interface. The Raspberry Pi exercise uses a separate, isolated two-node bench.</p>
<nav aria-label="CAN labs"><ol>
<li><a href="#virtual-can">Create a virtual CAN link</a></li>
<li><a href="#periodicity">Generate, log, filter and replay</a></li>
<li><a href="#socketcan-program">Send and receive with SocketCAN</a></li>
<li><a href="#raspberry-pi-mcp2515">Raspberry Pi 4 and MCP2515 bench (hardware)</a></li>
<li><a href="#error-counters">Inspect controller error counters (hardware)</a></li>
</ol></nav>
<section id="virtual-can">
<h2>Create a virtual CAN link</h2>
<p>Run these commands on Linux with administrative access. If <code>vcan</code> is built into the kernel, skip the module load. If the interface name already exists, stop and use a fresh lab environment. Continue only after <code>ip</code> confirms the link kind is <code>vcan</code> and the flags include <code>UP</code>.</p>
${code(`sudo modprobe vcan
sudo ip link add dev vcan-wire type vcan
sudo ip link set dev vcan-wire up
ip -details link show dev vcan-wire`)}
<p>Start the receiver first in terminal A. It exits after two frames. Send in terminal B.</p>
${code(`# Terminal A
candump -L -n 2 vcan-wire

# Terminal B
cansend vcan-wire 123#1122
cansend vcan-wire 00000123#3344`)}
<p>Look for timestamped lines ending in <code>123#1122</code> and <code>00000123#3344</code>. The textual widths distinguish the 11-bit and 29-bit formats even though the numeric identifiers match. If the receiver missed one, restart it and repeat both sends. Virtual CAN exercises the Linux API and log format. It has no physical bitrate, arbitration, ACK slot, termination, or on-wire error behavior. See the <a href="${socketCan}">SocketCAN documentation</a> and <a href="${canUtils}">can-utils command sources</a>.</p>
<p>Optional FD check on an FD-capable virtual link. Check the reported MTU before transmitting. If it is 16, configure it for CAN FD with these commands. If your kernel refuses the MTU change, skip this step.</p>
${code(`sudo ip link set dev vcan-wire down
sudo ip link set dev vcan-wire mtu 72
sudo ip link set dev vcan-wire up
ip -details link show dev vcan-wire`)}
<p>Start <code>candump -L -n 1 vcan-wire</code> before sending <code>cansend vcan-wire 321##10102030405060708090A0B0C</code>. The double hash introduces the FD flags nibble <code>1</code> (BRS), followed by 12 bytes. Check that the log preserves the FD marker and flag. The virtual link does not switch a physical bit rate. See the <a href="${href('buses/can')}">CAN FD reference</a>.</p>
</section>
<section id="periodicity">
<h2>Generate, log, filter and replay</h2>
<p>Use the virtual interface created above. In terminal A, create a fresh directory and start the receiver. In terminal B, generate exactly ten Classical frames. The filter matches identifier 123 in standard data format. Mask bits <code>0x80000000</code> and <code>0x40000000</code> require EFF and RTR to be clear.</p>
${code(`# Terminal A
lab_dir=$(mktemp -d)
cd "$lab_dir"
candump -L -n 10 vcan-wire,123:C00007FF > lab.log

# Terminal B
cangen vcan-wire -g 100 -I 123 -L 2 -D 1122 -n 10`)}
<p>After the receiver exits, run <code>wc -l lab.log</code>. Expect ten lines for <code>123#1122</code> and intervals around 100 ms. Analyze <code>lab.log</code> in the <a href="${href('buses/can/analyzer')}">capture analyzer</a> and check for ten frames, nine intervals and a single standard data stream. OS scheduling and timestamping can shift the intervals.</p>
<p>Start another <code>candump -L -n 10 vcan-wire</code> in terminal B, then replay from the directory containing <code>lab.log</code>. The explicit interface mapping keeps replay on the virtual device. Compare the frame sequence and timestamp differences between the original and replay.</p>
${code(`canplayer -I lab.log vcan-wire=vcan-wire`)}
<p>If you generate fewer frames or filter them out, stop the receiver with Ctrl+C. Keep the log for comparison or remove it when finished. Avoid replaying a bench recording through physical interfaces.</p>
</section>
<section id="socketcan-program">
<h2>Send and receive one frame through the Linux API</h2>
<p>Save <a href="${asset('bus-atlas/socketcan-lab.c')}" download>socketcan-lab.c</a> on the Linux host. It opens and binds a raw CAN socket to <code>vcan-wire</code>, installs an exact standard data-frame filter, and reads or writes a Classical <code>struct can_frame</code>. Build with your system C compiler.</p>
${code(`cc -std=c11 -Wall -Wextra -Werror socketcan-lab.c -o socketcan-lab

# Terminal A
./socketcan-lab rx

# Terminal B, within ten seconds
./socketcan-lab tx`)}
<p>Expect <code>123#1122</code> in each terminal. TX output confirms that Linux accepted the write and RX confirms delivery to the receiving socket. Repeat with <code>strace -e trace=socket,bind,setsockopt,read,write ./socketcan-lab rx</code> in terminal A. Identify the CAN socket's file descriptor and follow it from <code>socket</code> to <code>bind</code> and the 16-byte frame read. If the receive times out, start it again and send within ten seconds. See <a href="${tracing}">Execmap's runtime analysis guide</a> to distinguish process activity from protocol evidence.</p>
<p>After the virtual exercises, stop any remaining captures with Ctrl+C and delete the interface you created. Retain or remove the compiled binary and lab log as needed.</p>
${code('sudo ip link delete dev vcan-wire')}
</section>
<section id="raspberry-pi-mcp2515">
<h2>Raspberry Pi 4 and MCP2515 on an isolated Classical CAN bench</h2>
<p>Use a Pi 4, a documented MCP2515 SPI module with a suitable high-speed CAN transceiver, and a second known-good high-speed Classical CAN node that can transmit and ACK. The <a href="${pi4}">Pin Atlas Raspberry Pi 4 board profile</a> identifies the Pi header and SPI alternate functions. Use your module's specific schematic and component markings for the other end of each connection. The MCP2515 is a Classical CAN controller. Any FD-capable peer in this exercise must send Classical frames.</p>
<ol>
<li><strong>Verify logic and power before making connections.</strong> Check the module revision, oscillator marking, regulator and supply requirements, the controller's I/O voltage, logic translation in each direction, and the transceiver supply and normal-mode configuration. Verify that every signal driven into the Pi, including MISO and interrupt, is 3.3 V compatible. Allow for module boards that combine a 5 V transceiver with different logic arrangements. If documentation cannot establish compatibility, choose a documented module before powering the Pi.</li>
<li><strong>Map SPI with power off.</strong> Verify SPI clock, MOSI, MISO, chip select, interrupt, power and ground against the module schematic and Pin Atlas. Write down the selected SPI chip select and the BCM GPIO number for interrupt. Check for assignments already used by the OS or other hardware. Keep SPI leads short.</li>
<li><strong>Wire and measure the trunk.</strong> Connect CAN_H to CAN_H and CAN_L to CAN_L using a short twisted pair. Follow both transceivers' reference and grounding requirements, including isolation boundaries, and add the required reference connection on a non-isolated bench. Keep this bench separate from vehicle, industrial or other operational networks. Confirm one 120 Ω termination at each end, accounting for onboard resistors. On an unpowered conventional trunk, expect around 60 Ω across CAN_H and CAN_L.</li>
<li><strong>Configure the device tree.</strong> Back up the active Raspberry Pi boot configuration. On Raspberry Pi OS see <a href="${bootConfig}">the boot configuration reference</a> for <code>/boot/firmware/config.txt</code>. Check the installed overlay help with <code>dtoverlay -h mcp2515-can0</code> for SPI0 CE0 or the alternative that matches your wiring. For SPI0 CE0 the template below is illustrative. Replace every uppercase placeholder with verified values before saving. Choose an SPI speed within the module/controller limits for your voltage and setup, and give the actual oscillator frequency in Hz. Reboot and confirm the driver bound.
${code(`dtparam=spi=on
dtoverlay=mcp2515-can0,oscillator=OSCILLATOR_HZ,interrupt=BCM_GPIO,spimaxfrequency=SPI_HZ`)}
<code>ip -brief link</code> should list a CAN interface. Check <code>sudo dmesg | grep -Ei 'mcp251|spi'</code> for driver probe errors. Resolve SPI, power, oscillator and IRQ configuration before testing the CAN pair.</li>
<li><strong>Bring up both nodes at the same nominal rate.</strong> Use 125 kbit/s if both nodes support it for this bench. Substitute the interface you identified for <code>can0</code>. Start the peer in normal mode so it can ACK. Take a snapshot of both nodes' timing and error counters before sending.
${code(`sudo ip link set dev can0 down
sudo ip link set dev can0 type can bitrate 125000 restart-ms 0
sudo ip link set dev can0 up
ip -details -statistics link show dev can0`)}
</li>
<li><strong>Verify reception in both directions.</strong> Start <code>candump -L 'can0,0:0,#FFFFFFFF'</code> on the receiving node using its own interface name. From the other node send <code>cansend can0 123#1122</code> with the sender's interface. Expect <code>123#1122</code> in the peer's log. Reverse the roles and send <code>124#3344</code>. Check that the counters stay stable. If the exchange fails, bring the sender down to stop any retries and follow <a href="${href('buses/can/troubleshooting')}">the troubleshooting workflow</a>.</li>
</ol>
<p>Stop the captures, bring the lab CAN interfaces down and shut down power before rewiring or disconnecting anything. If the overlay was temporary, restore the boot configuration for your next boot. The lab confirms this specific two-node setup. Use the <a href="${mcp2515}">Microchip MCP2515 datasheet</a>, <a href="${overlays}">Raspberry Pi overlay reference</a>, and <a href="${physicalLayer}">TI CAN physical layer report</a> for component and topology checks.</p>
</section>
<section id="error-counters">
<h2>Inspect controller error counters</h2>
<p>On the isolated two-node bench, distinguish the controller’s current state and transmit/receive error counters from cumulative Linux interface statistics. Use an already working link with an identified CAN interface and a second node in normal mode. Substitute the bench interface for <code>can0</code>.</p>
${code(`# Capture terminal
candump -e -d 'can0,0:0,#FFFFFFFF'

# Measurement terminal
ip -details -statistics link show dev can0 > counters-before.txt
cansend can0 123#1122
ip -details -statistics link show dev can0 > counters-after.txt
diff -u counters-before.txt counters-after.txt`)}
<p>Confirm that the peer captured the known frame. A healthy exchange typically leaves the controller error-active and error counters stable while transmit or receive packet totals increase. Look for changes in <code>bus-errors</code>, <code>error-pass</code>, <code>bus-off</code> and socket drop notices. <code>berr-counter tx</code> and <code>rx</code> report current error confinement counters where the driver exposes them. Successful transfers can reduce those counters. Socket drops describe capture delivery, while bus errors come from the controller or driver.</p>
<p>If the driver omits counters or error reports, record that limitation and use the peer capture and physical measurements. Use the <a href="${href('buses/can/troubleshooting', 'error-states')}">error-state workflow</a> if the state changes. Stop candump with Ctrl+C and save or remove the two snapshots. Follow the bench shutdown steps after the exercise. See the <a href="${socketCan}">SocketCAN device statistics and error message documentation</a>.</p>
</section>`;
}
