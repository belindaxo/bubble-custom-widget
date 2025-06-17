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

            this._lastSentCategories = [];

            this._selectedPoint = null;
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
            this._selectedPoint = null;
        }

        /**
         * Specifies which attributes should trigger re-rendering on change.
         * @returns {string[]} An array of observed attribute names.
         */
        static get observedAttributes() {
            return [
                'chartTitle', 'titleSize', 'titleFontStyle', 'titleAlignment', 'titleColor',                            // Title properties
                'chartSubtitle', 'subtitleSize', 'subtitleFontStyle', 'subtitleAlignment', 'subtitleColor',             // Subtitle properties
                'axisTitleSize', 'axisTitleColor',                                                                      // Axis title properties
                'showLegend', 'legendLayout', 'legendAlignment', 'legendVerticalAlignment',                             // Legend properties 
                'xScaleFormat', 'yScaleFormat', 'zScaleFormat', 'xDecimalPlaces', 'yDecimalPlaces', 'zDecimalPlaces',   // Number formatting properties
                'customColors'
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
                if (this._chart) {
                    this._chart.destroy();
                    this._chart = null;
                    this._selectedPoint = null;
                }
                return;
            }

            const { data, metadata } = dataBinding;
            const { dimensions, measures } = parseMetadata(metadata);

            if (measures.length < 3) {
                if (this._chart) {
                    this._chart.destroy();
                    this._chart = null;
                    this._selectedPoint = null;
                }
                return;
            }

            const series = this._processBubbleSeriesData(data, dimensions, measures);

            const xLabel = measures[0].label || 'X-Axis';
            const yLabel = measures[1].label || 'Y-Axis';
            const zLabel = measures[2].label || 'Bubble Size';
            const dimDescription = dimensions[0]?.description || 'Dimension';

            const autoTitle = `${xLabel}, ${yLabel}, ${zLabel} per ${dimDescription}`;

            const validCategoryNames = series.map(s => s.name) || [];
            if (JSON.stringify(this._lastSentCategories) !== JSON.stringify(validCategoryNames)) {
                this._lastSentCategories = validCategoryNames;
                this.dispatchEvent(new CustomEvent('propertiesChanged', {
                    detail: {
                        properties: {
                            validCategoryNames
                        }
                    }
                }));
            }

            const xScaleFormat = (value) => this._xScaleFormat(value);
            const yScaleFormat = (value) => this._yScaleFormat(value);
            const zScaleFormat = (value) => this._zScaleFormat(value);

            const handlePointClick = (event) => this._handlePointClick(event, dataBinding, dimensions);

            Highcharts.setOptions({
                lang: {
                    thousandsSep: ','
                },
                colors: ['#004b8d', '#939598', '#faa834', '#00aa7e', '#47a5dc', '#006ac7', '#ccced2', '#bf8028', '#00e4a7'],
                navigation: {
                    buttonOptions: {
                        symbolStroke: '#004b8d',  // Outline color
                        symbolFill: 'transparent', // No fill
                        symbolStrokeWidth: 1,
                        // Core button shape settings
                        height: 32,          // Ensure square for circle
                        width: 32,
                        theme: {
                            r: 16,           // Rounded corners (half width = full circle)
                            fill: '#f7f7f7', // Background color
                            stroke: '#ccc',  // Thin outer border
                            'stroke-width': 0.8,
                            style: {
                                cursor: 'pointer'
                            }
                        }
                    }
                }
            });

            const gradientFillColors = [
                Highcharts.getOptions().colors[0],
                Highcharts.getOptions().colors[1],
                Highcharts.getOptions().colors[2],
                Highcharts.getOptions().colors[3],
                Highcharts.getOptions().colors[4],
                Highcharts.getOptions().colors[5],
                Highcharts.getOptions().colors[6],
                Highcharts.getOptions().colors[7],
                Highcharts.getOptions().colors[8]
            ];

            const customColors = this.customColors || [];

            // Apply gradient fill colors to series
            series.forEach((s, i) => {
                const customColor = customColors.find(c => c.category === s.name)?.color;
                const baseColor = customColor || gradientFillColors[i % gradientFillColors.length];
                const fill = Highcharts.color(baseColor).setOpacity(0.95).get('rgba');

                s.marker = {
                    fillColor: {
                        radialGradient: { cx: 0.4, cy: 0.3, r: 0.7 },
                        stops: [
                            [0, 'rgba(255, 255, 255, 0.5)'],
                            [1, fill]
                        ]
                    },
                    lineColor: fill,
                    states: {
                        hover: {
                            fillColor: {
                                radialGradient: { cx: 0.4, cy: 0.3, r: 0.7 },
                                stops: [
                                    [0, 'rgba(255, 255, 255, 0.5)'],
                                    [1, fill]
                                ]
                            },
                            lineColor: fill
                        }
                    }
                };

                s.states = {
                    hover: {
                        halo: {
                            attributes: {
                                fill: fill
                            }
                        }
                    }
                };
            });

            Highcharts.SVGRenderer.prototype.symbols.contextButton = function (x, y, w, h) {
                const radius = w * 0.11;
                const spacing = w * 0.4;

                const offsetY = 2;    // moves dots slightly down
                const offsetX = 1;  // moves dots slightly to the right

                const centerY = y + h / 2 + offsetY;
                const startX = x + (w - spacing * 2) / 2 + offsetX;

                const makeCirclePath = (cx, cy, r) => [
                    'M', cx - r, cy,
                    'A', r, r, 0, 1, 0, cx + r, cy,
                    'A', r, r, 0, 1, 0, cx - r, cy
                ];

                return [].concat(
                    makeCirclePath(startX, centerY, radius),
                    makeCirclePath(startX + spacing, centerY, radius),
                    makeCirclePath(startX + spacing * 2, centerY, radius)
                );
            };

            const titleText = this._updateTitle(autoTitle);

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
                    text: titleText,
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
                    enabled: true,
                    buttons: {
                        contextButton: {
                            enabled: false,
                        }
                    },
                    menuItemDefinitions: {
                        resetFilters: {
                            text: 'Reset Filters',
                            onclick: () => {
                                const linkedAnalysis = this.dataBindings.getDataBinding('dataBinding').getLinkedAnalysis();
                                if (linkedAnalysis) {
                                    linkedAnalysis.removeFilters();
                                    if (this._selectedPoint) {
                                        this._selectedPoint.select(false, false);
                                        this._selectedPoint = null;
                                    }
                                }
                            }

                        }
                    }
                },
                legend: {
                    enabled: this.showLegend || true,
                    layout: this.legendLayout || 'horizontal',
                    align: this.legendAlignment || 'center',
                    verticalAlign: this.legendVerticalAlignment || 'bottom'
                },
                tooltip: {
                    useHTML: true,
                    followPointer: true,
                    hideDelay: 0,
                    formatter: this._formatTooltip(measures, dimensions, xScaleFormat, yScaleFormat, zScaleFormat)
                },
                plotOptions: {
                    series: {
                        allowPointSelect: true,
                        cursor: 'pointer',
                        point: {
                            events: {
                                select: handlePointClick,
                                unselect: handlePointClick
                            }
                        }
                    }
                },
                yAxis: {
                    startOnTick: false,
                    endOnTick: false,
                    title: {
                        text: measures[1].label || 'Y-Axis',
                        margin: 20,
                        style: {
                            fontSize: this.axisTitleSize || '14px',
                            color: this.axisTitleColor || '#000000'
                        }
                    },
                    labels: {
                        formatter: this._formatYLabels(yScaleFormat)
                    }
                },
                xAxis: {
                    title: {
                        text: measures[0].label || 'X-Axis',
                        margin: 20,
                        style: {
                            fontSize: this.axisTitleSize || '14px',
                            color: this.axisTitleColor || '#000000'
                        }
                    },
                    tickWidth: 0,
                    labels: {
                        formatter: this._formatXLabels(xScaleFormat)
                    }
                },
                series
            }
            this._chart = Highcharts.chart(this.shadowRoot.getElementById('container'), chartOptions);

            this._adjustLegendPosition();

            const container = this.shadowRoot.getElementById('container');

            container.addEventListener("mouseenter", () => {
                if (this._chart) {
                    this._chart.update(
                        {
                            exporting: {
                                buttons: {
                                    contextButton: {
                                        enabled: true,
                                        symbol: 'contextButton',
                                        menuItems: ['resetFilters']
                                    },
                                },
                            },
                        },
                        true
                    );
                }
            });

            container.addEventListener("mouseleave", () => {
                if (this._chart) {
                    this._chart.update(
                        {
                            exporting: {
                                buttons: {
                                    contextButton: {
                                        enabled: false,
                                    },
                                },
                            },
                        },
                        true
                    );
                }
            });
        }

        /**
         * 
         * @param {string} autoTitle - Automatically generated title based on series and dimensions.
         * @returns {string} The title text.
         */
        _updateTitle(autoTitle) {
            if (!this.chartTitle || this.chartTitle.trim() === '') {
                return autoTitle;
            } else {
                return this.chartTitle;
            }
        }

        /**
         * Adjusts the legend position if it overlaps with the context button.
         */
        _adjustLegendPosition() {
            const legend = this._chart.legend;
            if (legend && legend.options.verticalAlign === 'top' && legend.options.align === 'right') {
                legend.update({ y: 40 }, false);
                this._chart.redraw();
            }
        }


        /**
         * Scales the x-axis value based on the selected scale format (k, m, b, percent).
         * @param {number} value 
         * @returns {Object} An object containing the scaled value and its suffix.
         */
        _xScaleFormat(value) {
            let scaledValue = value;
            let valueSuffix = '';

            switch (this.xScaleFormat) {
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
                scaledValue: scaledValue.toFixed(this.xDecimalPlaces),
                valueSuffix
            };
        }

        /**
         * Scales the y-axis value based on the selected scale format (k, m, b, percent).
         * @param {number} value 
         * @returns {Object} An object containing the scaled value and its suffix.
         */
        _yScaleFormat(value) {
            let scaledValue = value;
            let valueSuffix = '';

            switch (this.yScaleFormat) {
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
                scaledValue: scaledValue.toFixed(this.yDecimalPlaces),
                valueSuffix
            };
        }

        /**
         * Scales the z-axis value based on the selected scale format (k, m, b, percent).
         * @param {number} value 
         * @returns {Object} An object containing the scaled value and its suffix.
         */
        _zScaleFormat(value) {
            let scaledValue = value;
            let valueSuffix = '';

            switch (this.zScaleFormat) {
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
                scaledValue: scaledValue.toFixed(this.zDecimalPlaces),
                valueSuffix
            };
        }


        _formatTooltip(measures, dimensions, xScaleFormat, yScaleFormat, zScaleFormat) {
            return function () {
                const point = this.point;
                const series = this.series;

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
            }
        }

        /**
         * 
         * @param {Function} xScaleFormat - A function that formats x-axis values.
         * @returns {Function} A formatter function for x-axis labels.
         */
        _formatXLabels(xScaleFormat) {
            return function () {
                const { scaledValue, valueSuffix } = xScaleFormat(this.value);
                if (valueSuffix === '%') {
                    return `${Highcharts.numberFormat(scaledValue, -1, '.', ',')}${valueSuffix}`;
                } else {
                    return `${Highcharts.numberFormat(scaledValue, -1, '.', ',')} ${valueSuffix}`;
                }
            };
        }

        /**
         * 
         * @param {Function} yScaleFormat - A function that formats y-axis values.
         * @returns {Function} A formatter function for y-axis labels.
         */
        _formatYLabels(yScaleFormat) {
            return function () {
                const { scaledValue, valueSuffix } = yScaleFormat(this.value);
                if (valueSuffix === '%') {
                    return `${Highcharts.numberFormat(scaledValue, -1, '.', ',')}${valueSuffix}`;
                } else {
                    return `${Highcharts.numberFormat(scaledValue, -1, '.', ',')} ${valueSuffix}`;
                }
            };
        }

        _handlePointClick(event, dataBinding, dimensions) {
            const point = event.target;
            if (!point) {
                console.error('Point is undefined');
                return;
            }

            const dimension = dimensions[0];
            const dimensionKey = dimension.key;
            const dimensionId = dimension.id;
            const label = point.name || 'No Label';

            const selectedItem = dataBinding.data.find(
                (item) => item[dimensionKey].label === label
            );

            const linkedAnalysis = this.dataBindings.getDataBinding('dataBinding').getLinkedAnalysis();

            if (this._selectedPoint && this._selectedPoint !== point) {
                linkedAnalysis.removeFilters();
                this._selectedPoint.select(false, false);
                this._selectedPoint = null;
            }

            if (event.type === 'select') {
                if (selectedItem) {
                    const selection = {};
                    selection[dimensionId] = selectedItem[dimensionKey].id;
                    linkedAnalysis.setFilters(selection);
                    this._selectedPoint = point;
                }
            } else if (event.type === 'unselect') {
                linkedAnalysis.removeFilters();
                this._selectedPoint = null;
            }
        }

        // SAC Scripting Methods

        getBubbleMembers() {
            const dataBinding = this.dataBindings.getDataBinding('dataBinding');
            const members = dataBinding.getMembers('measures');
            return members;
        }

        getBubbleDimensions() {
            const dataBinding = this.dataBindings.getDataBinding('dataBinding');
            const dimensions = dataBinding.getDimensions('dimensions');
            return dimensions;
        }

        removeBubbleMember(memberId) {
            const dataBinding = this.dataBindings.getDataBinding('dataBinding');
            dataBinding.removeMember(memberId);
            console.log('removeBubbleMember - memberId:', memberId);
            this._renderChart();
        }

        removeBubbleDimension(dimensionId) {
            const dataBinding = this.dataBindings.getDataBinding('dataBinding');
            dataBinding.removeDimension(dimensionId);
            console.log('removeBubbleDimension - dimensionId:', dimensionId);
            this._renderChart();
        }

        addBubbleMember(memberId) {
            const dataBinding = this.dataBindings.getDataBinding('dataBinding');
            dataBinding.addMemberToFeed('measures', memberId);
            console.log('addBubbleMember - memberId:', memberId);
            this._renderChart();
        }

        addBubbleDimension(dimensionId) {
            const dataBinding = this.dataBindings.getDataBinding('dataBinding');
            console.log('addBubbleDimension - dataBinding:', dataBinding);
            dataBinding.addDimensionToFeed('dimensions', dimensionId);
            console.log('addBubbleDimension - dimensionId:', dimensionId);
            this._renderChart();
        }

    }
    customElements.define('com-sap-sample-bubble', Bubble);
})();