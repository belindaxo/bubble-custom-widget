/**
 * Updates the chart title based on the auto-generated title or user-defined title.
 * @param {string} autoTitle - Automatically generated title based on series and dimensions.
 * @param {string} chartTitle - User-defined title for the chart.
 * @returns {string} The title text.
 */
export function updateTitle(autoTitle, chartTitle) {
    if (!chartTitle || chartTitle === '') {
        return autoTitle;
    } else {
        return chartTitle;
    }
}

/**
 * Adjusts the legend position if it overlaps with the context button.
 * @param {Object} chartInstance - Reference Highcharts chart instance.
 */
export function adjustLegendPosition(chartInstance) {
    const legend = chartInstance?.legend;
    if (legend && legend.options.verticalAlign === 'top' && legend.options.align === 'right') {
        legend.update({ y: 40 }, false);
        chartInstance.redraw();
    }
}