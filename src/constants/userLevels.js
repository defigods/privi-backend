let LEVELS_MAP = new Map([
    [0, 1],
    [100, 2],
    [1000, 3],
    [10000, 4],
    [100000, 5]
]);

const LEVELS = [0, 250, 500, 1000, 1500, 2000, 2500, 3000];

const ONE_DAY = 60 * 60 * 24 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

module.exports = {
    LEVELS,
    ONE_DAY,
    ONE_HOUR
}