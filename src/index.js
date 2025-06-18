/**
 * Module dependencies for Highcharts 3D Funnel chart.
 */
import * as Highcharts from 'highcharts';
import 'highcharts/highcharts-more';
import 'highcharts/modules/exporting';

import { parseMetadata } from './metadataParser';
import { processBubbleSeriesData } from './dataProcessor';
import { xScaleFormat, yScaleFormat, zScaleFormat } from './scaleFormatters.js';
import { getDataLabelFormatter, getXLabelFormatter, getYLabelFormatter } from './labelFormatter.js';
import { getTooltipFormatter } from './tooltipFormatter.js';
import { handlePointClick } from './interactionHandlers.js';
import { updateTitle, adjustLegendPosition } from './chartUtils.js';


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
                'showDataLabels', 'allowOverlap', 'labelFormat',                                                        // Data label properties
                'showLegend', 'legendLayout', 'legendAlignment', 'legendVerticalAlignment',                             // Legend properties 
                'xScaleFormat', 'yScaleFormat', 'zScaleFormat', 'xDecimalPlaces', 'yDecimalPlaces', 'zDecimalPlaces',   // Number formatting properties
                'customColors'                                                                                          // Custom colors 
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

        /**
         * Renders the bubble chart using Highcharts.
         */
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
            console.log('Bubble Chart Data:', data);
            console.log('Bubble Chart Dimensions:', dimensions);
            console.log('Bubble Chart Measures:', measures);

            if (measures.length < 3) {
                if (this._chart) {
                    this._chart.destroy();
                    this._chart = null;
                    this._selectedPoint = null;
                }
                return;
            }

            const series = processBubbleSeriesData(data, dimensions, measures).filter(s => s.name !== 'Totals');
            console.log('Bubble Chart Series:', series);

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

            const xFormat = (value) => xScaleFormat(value, this.xScaleFormat, this.xDecimalPlaces);
            const yFormat = (value) => yScaleFormat(value, this.yScaleFormat, this.yDecimalPlaces);
            const zFormat = (value) => zScaleFormat(value, this.zScaleFormat, this.zDecimalPlaces);

            const labelFormat = this.labelFormat;

            const onPointClick = (event) => handlePointClick(event, dataBinding, dimensions, this);

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

            const titleText = updateTitle(autoTitle, this.chartTitle);

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
                    formatter: getTooltipFormatter(measures, dimensions, xFormat, yFormat, zFormat)
                },
                plotOptions: {
                    series: {
                        allowPointSelect: true,
                        cursor: 'pointer',
                        point: {
                            events: {
                                select: onPointClick,
                                unselect: onPointClick
                            }
                        }
                    },
                    bubble: {
                        dataLabels: {
                            enabled: this.showDataLabels || false,
                            allowOverlap: this.allowOverlap || false,
                            formatter: getDataLabelFormatter(labelFormat, zFormat),
                            style: {
                                fontWeight: 'normal'
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
                        formatter: getYLabelFormatter(yFormat)
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
                        formatter: getXLabelFormatter(xFormat)
                    }
                },
                series
            }
            this._chart = Highcharts.chart(this.shadowRoot.getElementById('container'), chartOptions);

            adjustLegendPosition(this._chart);

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

        // /**
        //  * Updates the chart title based on the auto-generated title or user-defined title.
        //  * @param {string} autoTitle - Automatically generated title based on series and dimensions.
        //  * @returns {string} The title text.
        //  */
        // _updateTitle(autoTitle) {
        //     if (!this.chartTitle || this.chartTitle.trim() === '') {
        //         return autoTitle;
        //     } else {
        //         return this.chartTitle;
        //     }
        // }

        // /**
        //  * Adjusts the legend position if it overlaps with the context button.
        //  */
        // _adjustLegendPosition() {
        //     const legend = this._chart.legend;
        //     if (legend && legend.options.verticalAlign === 'top' && legend.options.align === 'right') {
        //         legend.update({ y: 40 }, false);
        //         this._chart.redraw();
        //     }
        // }

        // SAC Scripting Methods
        /**
         * Returns the members of the specified feed of the bubble chart.
         * @returns {Array} An array of bubble members (measures) from the data binding.
         */
        getBubbleMembers() {
            const dataBinding = this.dataBindings.getDataBinding('dataBinding');
            const members = dataBinding.getMembers('measures');
            return members;
        }

        /**
         * Returns the dimensions of the bubble chart.
         * @returns {Array} An array of bubble dimensions from the data binding.
         */
        getBubbleDimensions() {
            const dataBinding = this.dataBindings.getDataBinding('dataBinding');
            const dimensions = dataBinding.getDimensions('dimensions');
            return dimensions;
        }

        /**
         * Removes the specified member from the bubble chart.
         * @param {string} memberId - The ID of the member to remove from the bubble chart.
         */
        removeBubbleMember(memberId) {
            const dataBinding = this.dataBindings.getDataBinding('dataBinding');
            dataBinding.removeMember(memberId);
            console.log('removeBubbleMember - memberId:', memberId);
        }

        /**
         * Removes the specified dimension from the bubble chart.
         * @param {string} dimensionId - The ID of the dimension to remove from the bubble chart.
         */
        removeBubbleDimension(dimensionId) {
            const dataBinding = this.dataBindings.getDataBinding('dataBinding');
            dataBinding.removeDimension(dimensionId);
            console.log('removeBubbleDimension - dimensionId:', dimensionId);
        }

        /**
         * Adds the specified member to the bubble chart.
         * @param {string} memberId - The ID of the member to add to the bubble chart.
         */
        addBubbleMember(memberId) {
            const dataBinding = this.dataBindings.getDataBinding('dataBinding');
            dataBinding.addMemberToFeed('measures', memberId);
            console.log('addBubbleMember - memberId:', memberId);
        }

        /**
         * Adds the specified dimension to the bubble chart.
         * @param {string} dimensionId - The ID of the dimension to add to the bubble chart.
         */
        addBubbleDimension(dimensionId) {
            const dataBinding = this.dataBindings.getDataBinding('dataBinding');
            dataBinding.addDimensionToFeed('dimensions', dimensionId);
            console.log('addBubbleDimension - dimensionId:', dimensionId);
        }
    }
    customElements.define('com-sap-sample-bubble', Bubble);
})();