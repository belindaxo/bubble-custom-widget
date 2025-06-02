/**
 * Module dependencies for Highcharts 3D Funnel chart.
 */
import * as Highcharts from 'highcharts';
import 'highcharts/highcharts-more';
import 'highcharts/modules/exporting';

/**
 * Parses metadata into structured dimensions and measures.
 * @param {Object} metadata - The metadata object from SAC data binding.
 * @returns {Object} An object containing parsed dimensions, measures, and their maps.
 */
var parseMetadata = metadata => {
    const { dimensions: dimensionsMap, mainStructureMembers: measuresMap } = metadata;
    const dimensions = [];
    for (const key in dimensionsMap) {
        const dimension = dimensionsMap[key];
        dimensions.push({ key, ...dimension });
    }

    const measures = [];
    for (const key in measuresMap) {
        const measure = measuresMap[key];
        measures.push({ key, ...measure });
    }
    return { dimensions, measures, dimensionsMap, measuresMap };
}
(function () {
    /**
     * Custom Web Component for rendering a Bubble Chart in SAP Analytics Cloud.
     * @extends HTMLElement
     */
    class Bubble extends HTMLElement {
        /**
         * Initializes the shadow DOM, styles, and chart container.
         */
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });

            // Create a CSSStyleSheet for the shadow DOM
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(`
                @font-face {
                    font-family: '72';
                    src: url('../fonts/72-Regular.woff2') format('woff2');
                }
                #container {
                    width: 100%;
                    height: 100%;
                    font-family: '72';
                }
            `);

            // Apply the stylesheet to the shadow DOM
            this.shadowRoot.adoptedStyleSheets = [sheet];

            // Add the container for the chart
            this.shadowRoot.innerHTML = `
                <div id="container"></div>    
            `;
        }

        /**
         * Called when the widget is resized.
         * @param {number} width - New width of the widget.
         * @param {number} height - New height of the widget.
         */
        onCustomWidgetResize(width, height) {
            this._renderChart();
        }

        /**
         * Called after widget properties are updated.
         * @param {Object} changedProperties - Object containing changed attributes.
         */
        onCustomWidgetAfterUpdate(changedProperties) {
            this._renderChart();
        }

        /**
         * Called when the widget is destroyed. Cleans up chart instance.
         */
        onCustomWidgetDestroy() {
            if (this._chart) {
                this._chart.destroy();
                this._chart = null;
            }
            this._selectedPoint = null; // Reset selection when chart is destroyed
        }

        /**
         * Specifies which attributes should trigger re-rendering on change.
         * @returns {string[]} An array of observed attribute names.
         */
        static get observedAttributes() {
            return [
                'chartTitle', 'titleSize', 'titleFontStyle', 'titleAlignment', 'titleColor',                // Title properties
                'chartSubtitle', 'subtitleSize', 'subtitleFontStyle', 'subtitleAlignment', 'subtitleColor', // Subtitle properties
                'xScaleFormat', 'yScaleFormat', 'zScaleFormat', 'decimalPlaces'                             // Number formatting properties
            ];
        }

        /**
         * Called when an observed attribute changes.
         * @param {string} name - The name of the changed attribute.
         * @param {string} oldValue - The old value of the attribute.
         * @param {string} newValue - The new value of the attribute.
         */
        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue !== newValue) {
                this[name] = newValue;
                this._renderChart();
            }
        }

        _processBubbleSeriesData(data, dimensions, measures) {
            const xKey = measures[0].key; // X-axis measure
            const yKey = measures[1].key; // Y-axis measure
            const zKey = measures[2].key; // Bubble size measure
            const dimension = dimensions[0] // dimension for grouping, optional

            if (!xKey || !yKey || !zKey) {
                return [];
            }

            if (dimension) {
                const dimensionKey = dimension.key;
                const dimensionId = dimension.id;
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

        _renderChart() {
            const dataBinding = this.dataBinding;
            if (!dataBinding || dataBinding.state !== 'success') {
                return;
            }

            const { data, metadata } = dataBinding;
            const { dimensions, measures } = parseMetadata(metadata);
            console.log('dimensions:', dimensions);
            console.log('measures:', measures);

            if (measures.length < 3) {
                if (this._chart) {
                    this._chart.destroy();
                    this._chart = null;
                }
                return;
            }
            
            const series = this._processBubbleSeriesData(data, dimensions, measures);
            console.log('Processed Bubble Series Data:', series);

            const scaleFormatX = (value) => this._formatValueByScale(this.xScaleFormat, value);
            const scaleFormatY = (value) => this._formatValueByScale(this.yScaleFormat, value);
            const scaleFormatZ = (value) => this._formatValueByScale(this.zScaleFormat, value);


            Highcharts.setOptions({
                lang: {
                    thousandsSep: ','
                },
                colors: ['#004b8d', '#47a5dc', '#faa834', '#00aa7e', '#006ac7', '#bf8028', '#00e4a7']
            });

            const chartOptions = {
                chart: {
                    type: 'bubble',
                    style: {
                        fontFamily: "'72', sans-serif"
                    }
                },
                credits: {
                    enabled: false
                },
                title: {
                    text: this.chartTitle || "",
                    align: this.titleAlignment || "left",
                    style: {
                        fontSize: this.titleSize || "16px",
                        fontStyle: this.titleFontStyle || "bold",
                        color: this.titleColor || "#004B8D"
                    }
                },
                subtitle: {
                    text: this.chartSubtitle || "",
                    align: this.subtitleAlignment || "left",
                    style: {
                        fontSize: this.subtitleSize || "11px",
                        fontStyle: this.subtitleFontStyle || "normal",
                        color: this.subtitleColor || "#000000",
                    },
                },
                exporting: {
                    enabled: false
                },
                tooltip: {
                    useHTML: true,
                    followPointer: true,
                    hideDelay: 0,
                    formatter: this._formatTooltip(measures, dimensions, scaleFormatX, scaleFormatY, scaleFormatZ)
                },
                yAxis: {
                    startOnTick: false,
                    endOnTick: false,
                    title: {
                        text: measures[1].label || 'Y-Axis'
                    }
                },
                xAxis: {
                    title: {
                        text: measures[0].label || 'X-Axis'
                    }
                },
                series
            }
            this._chart = Highcharts.chart(this.shadowRoot.getElementById('container'), chartOptions);
        }


        _formatValueByScale(scaleType, value) {
            let scaledValue = value;
            let valueSuffix = '';

            switch (scaleType) {
                case 'k':
                    scaledValue = value / 1000;
                    valueSuffix = 'k';
                    break;
                case 'm':
                    scaledValue = value / 1000000;
                    valueSuffix = 'm';
                    break;
                case 'b':
                    scaledValue = value / 1000000000;
                    valueSuffix = 'b';
                    break;
                case 'percent':
                    scaledValue = value * 100;
                    valueSuffix = '%';
                    break;
                default:
                    break;
            }
            return {
                scaledValue: scaledValue.toFixed(this.decimalPlaces),
                valueSuffix
            };
        }

        _formatTooltip(measures, dimensions, scaleFormatX, scaleFormatY, scaleFormatZ) {
            return function () {
                const point = this.point;
                const series = this.series;

                const groupLabel = point.name || "point.name";
                const dimensionName = dimensions[0].description || "dimensions[0].description";
                const measureNames = measures.map(m => m.label);

                const scaledX = scaleFormatX(this.x);
                const scaledY = scaleFormatY(this.y);
                const scaledZ = scaleFormatZ(this.z);

                const x = Highcharts.numberFormat(scaledX.scaledValue, -1, '.', ',') + ` ${scaledX.valueSuffix}`;
                const y = Highcharts.numberFormat(scaledY.scaledValue, -1, '.', ',') + ` ${scaledY.valueSuffix}`;
                const z = Highcharts.numberFormat(scaledZ.scaledValue, -1, '.', ',') + ` ${scaledZ.valueSuffix}`;

                return `
                    <div style="text-align: left; font-family: '72', sans-serif; font-size: 14px;">
                        <div style="font-size: 12px; font-weight: normal; color: #666666;">${dimensionName}</div>
                        <div style="font-size: 18px; font-weight: bold; color: #000000;">${groupLabel}</div>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 5px 0;">
                        <table style="width: 100%; font-size: 14px; color: #000000;">
                            <tr>
                                <td style="text-align: left; padding-right: 10px;">${measureNames[0]}:</td>
                                <td style="text-align: right; padding-left: 10px;">${x}</td>
                            </tr>
                            <tr>
                                <td style="text-align: left; padding-right: 10px;">${measureNames[1]}:</td>
                                <td style="text-align: right; padding-left: 10px;">${y}</td>
                            </tr>
                            <tr>
                                <td style="text-align: left; padding-right: 10px;">${measureNames[2]}:</td>
                                <td style="text-align: right; padding-left: 10px;">${z}</td>
                            </tr>
                        </table>
                    </div>
                `;
            }
            
        }
    }
    customElements.define('com-sap-sample-bubble', Bubble);
})();