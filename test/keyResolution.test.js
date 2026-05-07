const assert = require('node:assert/strict');
const test = require('node:test');

const { computeCandidateKeys, getFilePrefix } = require('../out/utils/keyResolution');

test('getFilePrefix returns the Python filename without extension', () => {
    assert.equal(getFilePrefix('base.py'), 'base');
    assert.equal(getFilePrefix('README.md'), undefined);
});

test('computeCandidateKeys follows EzCord-style context order', () => {
    assert.deepEqual(
        computeCandidateKeys('daily_footer', {
            filePrefix: 'base',
            functionName: 'notification',
            className: 'ReminderView',
        }),
        [
            'base.notification.daily_footer',
            'base.ReminderView.daily_footer',
            'base.general.daily_footer',
            'base.daily_footer',
            'general.daily_footer',
            'daily_footer',
        ]
    );
});

test('computeCandidateKeys keeps full keys available for direct resolution', () => {
    assert.deepEqual(
        computeCandidateKeys('base.notification.reminder.daily_footer', { filePrefix: 'base' }),
        [
            'base.general.base.notification.reminder.daily_footer',
            'base.base.notification.reminder.daily_footer',
            'general.base.notification.reminder.daily_footer',
            'base.notification.reminder.daily_footer',
        ]
    );
});
