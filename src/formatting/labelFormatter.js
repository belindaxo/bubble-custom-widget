import * as Highcharts from 'highcharts';

/**
 * Formats data labels based on the selected label format.
 * @param {string} labelFormat - The format for data labels ('label' or 'value').
 * @param {Function} zScaleFormat - A function that formats z-axis values.
 * @returns {Function} A formatter function for data labels.
 */
export function getDataLabelFormatter(labelFormat, zScaleFormat) {
    return function () {
        const point = this.point;
        const name = point.name || 'No Name';
        const { scaledValue: scaledValueZ, valueSuffix: valueSuffixZ } = zScaleFormat(this.z);
        const valueZ = Highcharts.numberFormat(scaledValueZ, -1, '.', ',');

        if (labelFormat === 'label') {
            return `${name}`;
        } else if (labelFormat === 'value') {
            return `${valueZ}`;
        }
    }
}

/**
 * 
 * @param {Function} xScaleFormat - A function that formats x-axis values.
 * @returns {Function} A formatter function for x-axis labels.
 */
export function getXLabelFormatter(xScaleFormat) {
    return function () {
        const { scaledValue, valueSuffix } = xScaleFormat(this.value);
        const value = Highcharts.numberFormat(scaledValue, -1, '.', ',');
        if (valueSuffix === '%') {
            return `${value}${valueSuffix}`;
        } else {
            return `${value} ${valueSuffix}`;
        }
    };
}

/**
 * 
 * @param {Function} yScaleFormat - A function that formats y-axis values.
 * @returns {Function} A formatter function for y-axis labels.
 */
export function getYLabelFormatter(yScaleFormat) {
    return function () {
        const { scaledValue, valueSuffix } = yScaleFormat(this.value);
        const value = Highcharts.numberFormat(scaledValue, -1, '.', ',');
        if (valueSuffix === '%') {
            return `${value}${valueSuffix}`;
        } else {
            return `${value} ${valueSuffix}`;
        }
    };
}