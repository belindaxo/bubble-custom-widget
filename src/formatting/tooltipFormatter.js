import * as Highcharts from 'highcharts';

/**
 * Formats the tooltip content for the bubble chart.
 * @param {Array} measures - Array of measure objects.
 * @param {Array} dimensions - Array of dimension objects.
 * @param {Function} xScaleFormat - A function that formats x-axis values.
 * @param {Function} yScaleFormat - A function that formats y-axis values.
 * @param {Function} zScaleFormat - A function that formats z-axis values.
 * @returns {Function} A formatter function for tooltips.
 */
export function getTooltipFormatter(measures, dimensions, xScaleFormat, yScaleFormat, zScaleFormat) {
    return function () {
        const point = this.point;

        const groupLabel = point.name || "point.name";
        const dimensionName = dimensions[0].description || "dimensions[0].description";
        const measureNames = measures.map(m => m.label);

        const { scaledValue: scaledValueX, valueSuffix: valueSuffixX } = xScaleFormat(this.x);
        const { scaledValue: scaledValueY, valueSuffix: valueSuffixY } = yScaleFormat(this.y);
        const { scaledValue: scaledValueZ, valueSuffix: valueSuffixZ } = zScaleFormat(this.z);


        const valueX = Highcharts.numberFormat(scaledValueX, -1, '.', ',');
        const valueY = Highcharts.numberFormat(scaledValueY, -1, '.', ',');
        const valueZ = Highcharts.numberFormat(scaledValueZ, -1, '.', ',');

        const valueWithSuffixX = `${valueX} ${valueSuffixX}`;
        const valueWithSuffixY = `${valueY} ${valueSuffixY}`;
        const valueWithSuffixZ = `${valueZ} ${valueSuffixZ}`;

        return `
            <div style="text-align: left; font-family: '72', sans-serif; font-size: 14px;">
                <div style="font-size: 12px; font-weight: normal; color: #666666;">${dimensionName}</div>
                <div style="font-size: 18px; font-weight: normal; color: #000000;">${groupLabel}</div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 5px 0;">
                <table style="width: 100%; font-size: 14px; color: #000000;">
                    <tr>
                        <td style="text-align: left; padding-right: 10px;">${measureNames[0]}:</td>
                        <td style="text-align: right; padding-left: 10px;">${valueWithSuffixX}</td>
                    </tr>
                    <tr>
                        <td style="text-align: left; padding-right: 10px;">${measureNames[1]}:</td>
                        <td style="text-align: right; padding-left: 10px;">${valueWithSuffixY}</td>
                    </tr>
                    <tr>
                        <td style="text-align: left; padding-right: 10px;">${measureNames[2]}:</td>
                        <td style="text-align: right; padding-left: 10px;">${valueWithSuffixZ}</td>
                    </tr>
                </table>
            </div>
        `;
    };
}