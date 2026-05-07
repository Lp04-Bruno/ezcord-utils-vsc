const assert = require('node:assert/strict');
const test = require('node:test');

const { findYamlKeyLocations } = require('../out/language/yamlKeyLocations');

test('findYamlKeyLocations keeps list-valued keys on the parent key line', () => {
    const yaml = [
        'base:',
        '  notification:',
        '    reminder:',
        '      daily_footer:',
        '        - Manage your notifications with {notification_cmd}',
        '        - You are awesome :)',
    ].join('\n');

    const locations = findYamlKeyLocations(yaml);

    assert.equal(locations.get('base.notification.reminder.daily_footer')?.line, 3);
    assert.equal(locations.has('base.notification.reminder.daily_footer.You are awesome'), false);
});

test('findYamlKeyLocations ignores key-like text inside block scalars', () => {
    const yaml = [
        'base:',
        '  notification:',
        '    reminder:',
        '      daily_footer: |',
        '        Manage your notifications with {notification_cmd}',
        '        You are awesome :)',
        '      title: Daily reminder',
    ].join('\n');

    const locations = findYamlKeyLocations(yaml);

    assert.equal(locations.get('base.notification.reminder.daily_footer')?.line, 3);
    assert.equal(locations.get('base.notification.reminder.title')?.line, 6);
    assert.equal(locations.has('base.notification.reminder.You are awesome'), false);
});
