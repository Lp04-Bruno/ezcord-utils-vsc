const assert = require('node:assert/strict');
const test = require('node:test');

const { parseYamlToFlatMap } = require('../out/language/simpleYaml');

test('parseYamlToFlatMap flattens nested keys and block scalars', () => {
    const flat = parseYamlToFlatMap([
        'base:',
        '  notification:',
        '    title: Daily Reminder',
        '    body: |',
        '      Line one',
        '      Line two',
    ].join('\n'));

    assert.equal(flat.get('base.notification.title'), 'Daily Reminder');
    assert.equal(flat.get('base.notification.body'), 'Line one\nLine two');
});

test('parseYamlToFlatMap handles quoted multiline values', () => {
    const flat = parseYamlToFlatMap([
        'base:',
        '  text: "Hello',
        'world"',
    ].join('\n'));

    assert.equal(flat.get('base.text'), 'Hello\nworld');
});
