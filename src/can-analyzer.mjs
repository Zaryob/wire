export function canAnalyzer({ href, asset }) {
  return `
    <p class="bus-lead">Import plain candump output or a <code>candump -L</code> log. The analyzer reads the file on this device and runs without uploading the capture.</p>
    <div class="bus-input-panel">
      <label>Import capture <input id="can-file" type="file" accept=".log,.txt,text/plain"></label>
      <label>Teaching sample <select id="can-sample">
        <option value="">Choose a synthetic dataset</option>
        <option value="${asset('bus-atlas/samples/periodic.log')}">Periodicity and jitter</option>
        <option value="${asset('bus-atlas/samples/mixed.log')}">Mixed formats and edge cases</option>
      </select></label>
      <button id="can-load" class="button secondary" type="button" disabled>Load sample</button>
    </div>
    <details class="bus-format">
      <summary>Supported log formats and samples</summary>
      <p>Compact Classical CAN, CAN FD, remote and SocketCAN error records are supported. The compact format uses three hex digits for an 11-bit ID and eight for a 29-bit ID, for example <code>(12.000001) can0 123#AABB</code>, <code>can0 00000123#R8</code> or <code>can0 123##10102</code>. Plain display records use <code>[8]</code> for Classical CAN and <code>[08]</code> for CAN FD, following can-utils’ width convention. DLC is inferred from length unless the record carries it explicitly. Plain display CAN FD omits flag values.</p>
      <p>Use numeric absolute timestamps or seconds relative to a shared origin, with up to nine fractional digits. If your log uses per-record deltas, calendar dates or decorated output, recapture with <code>candump -L</code>. Records without timestamps still count. Limits are 10 MiB and 100,000 lines per import.</p>
      <ul>
        <li><a href="${asset('bus-atlas/samples/periodic.log')}" download>Download periodic.log</a> — eleven synthetic frames with a 10 ms median and a 0.25 ms excursion on either side.</li>
        <li><a href="${asset('bus-atlas/samples/mixed.log')}" download>Download mixed.log</a> — ten synthetic records and one deliberately malformed line. Includes a backwards timestamp, a tie and untimed traffic.</li>
      </ul>
      <p>Formats are based on <a href="https://github.com/linux-can/can-utils/blob/master/candump.c">can-utils candump</a> and its <a href="https://github.com/linux-can/can-utils/blob/master/lib.c">frame formatter</a>. See the <a href="${href('buses/can/labs', 'periodicity')}">periodicity lab</a> to record your own data.</p>
    </details>
    <noscript><p>Enable JavaScript to analyze captures in this browser.</p></noscript>
    <p id="can-import-status" class="bus-status" role="status">Choose a capture file or load a teaching sample.</p>

    <div id="can-analysis" hidden>
      <div class="bus-input-panel">
        <label>Interface <select id="can-interface"><option value="">All interfaces</option></select></label>
        <form id="can-filter" class="bus-filter">
          <label>Hex CAN ID <input id="can-id" placeholder="e.g. 123" inputmode="text" spellcheck="false" pattern="(?:0[xX])?[0-9a-fA-F]{1,8}" title="Enter one to eight hexadecimal digits"></label>
          <button class="button secondary" type="submit">Apply ID filter</button>
        </form>
        <button id="can-export" class="button secondary" type="button">Export analysis JSON</button>
      </div>
      <p class="bus-hint">Three digits match a standard ID. Eight match an extended ID. Other widths match the numeric ID in either format. Filter by interface to compare timestamps from one clock.</p>
      <p id="can-summary" class="bus-status" role="status"></p>
      <details id="can-import-details" class="bus-format" hidden>
        <summary>Import diagnostics</summary>
        <ol id="can-diagnostics"></ol>
        <p id="can-diagnostics-limit"></p>
      </details>

      <section aria-labelledby="can-timeline-title">
        <h2 id="can-timeline-title">Capture timeline</h2>
        <p id="can-timeline-text"></p>
        <div id="can-timeline" class="bus-plot"></div>
        <details id="can-timeline-details" class="bus-format" hidden><summary>Timeline bin counts</summary>
          <div class="table-scroll" role="region" aria-label="Timeline bin counts" tabindex="0">
            <table class="bus-table"><thead><tr><th scope="col">Bin start (ms)</th><th scope="col">Messages</th><th scope="col">Error records</th></tr></thead><tbody id="can-bins"></tbody></table>
          </div>
        </details>
      </section>

      <section aria-labelledby="can-streams-title">
        <h2 id="can-streams-title">Message statistics by ID</h2>
        <p>Grouped by interface, ID format and frame type. TX and RX records in the same stream are counted together. Intervals use consecutive timestamped records in time order. Rate is interval count divided by the first-to-last timestamp span. Percentiles use nearest rank.</p>
        <div class="table-scroll" role="region" aria-labelledby="can-streams-title" tabindex="0">
          <table class="bus-table"><thead><tr><th scope="col">Interface</th><th scope="col">ID</th><th scope="col">Frame</th><th scope="col">Count</th><th scope="col">Timed</th><th scope="col">Hz</th><th scope="col">Mean ms</th><th scope="col">Median ms</th><th scope="col">Min ms</th><th scope="col">Max ms</th><th scope="col">p95 ms</th><th scope="col">p99 ms</th><th scope="col">Backwards</th><th scope="col">Ties</th><th scope="col">Plot</th></tr></thead><tbody id="can-streams"></tbody></table>
        </div>
        <div id="can-stream-pager" class="bus-pager"></div>
      </section>
      <section aria-labelledby="can-jitter-title">
        <h2 id="can-jitter-title">Inter-arrival jitter</h2>
        <p id="can-jitter-text" role="status"></p>
        <div id="can-jitter" class="bus-plot"></div>
      </section>

      <section aria-labelledby="can-records-title">
        <h2 id="can-records-title">Capture records</h2>
        <p>Records retain file order. SocketCAN error reports carry a class mask and controller-supplied diagnostic bytes. They are excluded from per-ID message statistics.</p>
        <div class="table-scroll" role="region" aria-labelledby="can-records-title" tabindex="0">
          <table class="bus-table"><thead><tr><th scope="col">Line</th><th scope="col">Timestamp (s)</th><th scope="col">Interface</th><th scope="col">ID or error token</th><th scope="col">Frame</th><th scope="col">DLC</th><th scope="col">Bytes</th><th scope="col">Payload</th><th scope="col">Details</th></tr></thead><tbody id="can-records"></tbody></table>
        </div>
        <div id="can-record-pager" class="bus-pager"></div>
      </section>
      <p class="bus-hint">Observed gaps can reflect sender behavior, filtering, buffering or capture loss. Use controller and capture diagnostics to investigate. Physical bus utilization requires additional wire-level evidence.</p>
    </div>
    <script type="module" src="${asset('bus-atlas/can-analyzer.mjs')}"></script>`;
}
