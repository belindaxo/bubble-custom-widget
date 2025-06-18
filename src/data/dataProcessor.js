/**
 * Processes the data for the bubble series based on dimensions and measures.
 * @param {Array} data - The raw data from the data binding.
 * @param {Array} dimensions - Array of dimension objects.
 * @param {Array} measures - Array of measure objects.
 * @returns {Array} An array of series objects formatted for Highcharts.
 */
export function processBubbleSeriesData(data, dimensions, measures) {
    const xKey = measures[0].key; // X-axis measure
    const yKey = measures[1].key; // Y-axis measure
    const zKey = measures[2].key; // Bubble size measure
    const dimension = dimensions[0] // dimension for grouping, optional

    if (!xKey || !yKey || !zKey) {
        return [];
    }

    if (dimension) {
        const dimensionKey = dimension.key;
        const grouped = {};

        data.forEach(row => {
            const label = row[dimensionKey].label || 'No Label';

            if (!grouped[label]) {
                grouped[label] = [];
            }

            grouped[label].push({
                x: row[xKey].raw,
                y: row[yKey].raw,
                z: row[zKey].raw,
                name: label
            });
        });

        return Object.entries(grouped).map(([label, groupData]) => ({
            name: label,
            data: groupData
        }));
    } else {
        // no dimension, return a single series
        return [{
            name: 'All Data',
            data: data.map(row => ({
                x: row[xKey].raw,
                y: row[yKey].raw,
                z: row[zKey].raw
            }))
        }];
    }
}