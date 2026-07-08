import test from "node:test";
import assert from "node:assert/strict";
import { extractTextFromHtml } from "./textExtractor";

test("extracts text from <main> when present", () => {
  const html = "<html><body><nav>Nav</nav><main><p>Hello world</p></main><footer>Footer</footer></body></html>";
  assert.equal(extractTextFromHtml(html), "Hello world");
});

test("falls back to <article> when no <main>", () => {
  const html = "<html><body><header>Header</header><article><p>Article body</p></article></body></html>";
  assert.equal(extractTextFromHtml(html), "Article body");
});

test("falls back to role=\"main\" when no <main> or <article>", () => {
  const html = '<div role="main"><p>Main role content</p></div>';
  assert.equal(extractTextFromHtml(html), "Main role content");
});

test("falls back to div#content when nothing else matches", () => {
  const html = '<div id="content"><p>Content div text</p></div>';
  assert.equal(extractTextFromHtml(html), "Content div text");
});

test("falls back to full document when no content region found", () => {
  const html = "<html><body><p>Whole page</p></body></html>";
  assert.equal(extractTextFromHtml(html), "Whole page");
});

test("strips script and style tags entirely, including their content", () => {
  const html = "<main><script>alert('x')</script><style>.a{color:red}</style><p>Visible</p></main>";
  assert.equal(extractTextFromHtml(html), "Visible");
});

test("strips nav, header, footer, aside subtrees", () => {
  const html = "<main><nav>Nav links</nav><header>Head</header><p>Real content</p><aside>Side</aside><footer>Foot</footer></main>";
  assert.equal(extractTextFromHtml(html), "Real content");
});

test("decodes HTML entities without double-decoding &amp;", () => {
  const html = "<main><p>Tom &amp;amp; Jerry &lt;3</p></main>";
  assert.equal(extractTextFromHtml(html), "Tom &amp; Jerry <3");
});

test("decodes quote and nbsp entities", () => {
  const html = "<main><p>&quot;quoted&quot;&nbsp;text&#39;s</p></main>";
  assert.equal(extractTextFromHtml(html), '"quoted" text\'s');
});

test("normalizes whitespace and drops blank lines", () => {
  const html = "<main><p>  Line one  </p><p>Line two</p><div>   </div></main>";
  assert.equal(extractTextFromHtml(html), "Line one\nLine two");
});

test("returns empty string for content-free HTML", () => {
  const html = "<main><script>ignored()</script></main>";
  assert.equal(extractTextFromHtml(html), "");
});
