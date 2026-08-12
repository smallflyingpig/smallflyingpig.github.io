const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const english = readFileSync(path.join(root, 'index.html'), 'utf8');
const chinese = readFileSync(path.join(root, 'index_ch.html'), 'utf8');

function aboutSection(html) {
  const match = html.match(/<section id="about"[\s\S]*?<\/section>/);
  assert.ok(match, 'about section must exist');
  return match[0];
}

test('Chinese homepage uses the approved public Meituan description', () => {
  assert.match(
    aboutSection(chinese),
    /目前在美团担任高级工程师，从事大语言模型相关研发工作。/,
  );
  assert.match(chinese, /高级工程师 @ 美团/);
});

test('English homepage uses the aligned public Meituan description', () => {
  assert.match(
    aboutSection(english),
    /I am currently a Senior Engineer at Meituan, working on large language models\./,
  );
  assert.match(english, /Senior Engineer @ Meituan/);
});

test('public role descriptions omit detailed internal-work terminology', () => {
  const publicDescriptions = aboutSection(chinese) + aboutSection(english);
  for (const term of ['PR/Issue', 'repo-level', 'pipeline', 'dataset', 'metric']) {
    assert.doesNotMatch(publicDescriptions, new RegExp(term, 'i'), term);
  }
});

test('CV remains byte-for-byte unchanged', () => {
  const cv = readFileSync(path.join(root, 'paper/jiguo_cv.pdf'));
  const digest = createHash('sha256').update(cv).digest('hex');
  assert.equal(digest, '211c1937f15d0c548f64f6e39fb29b030b3553dca64a7769732af1fabdc96b80');
});

test('both homepages provide the same visible site-wide PV badge', () => {
  for (const html of [english, chinese]) {
    assert.match(html, /https:\/\/hits\.sh\/smallflyingpig\.github\.io\.svg\?[^"']*extraCount=10000/);
    assert.doesNotMatch(html, /busuanzi/);
    assert.doesNotMatch(html, /pageviews\.js/);
    assert.equal((html.match(/hm\.baidu\.com/g) || []).length, 1);
  }
});

test('PV counter copy is localized', () => {
  assert.match(english, /alt="Total visits"/);
  assert.match(chinese, /alt="累计访问"/);
});
