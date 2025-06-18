/**
 * Event handler for point click events.
 * @param {Object} event - The event object containing the click event.
 * @param {Object} dataBinding - The data binding object containing the data.
 * @param {Array} dimensions - Array of dimension objects.
 * @param {Object} widget - Reference to the widget ('this', in context).
 */
export function handlePointClick(event, dataBinding, dimensions, widget) {
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

    const linkedAnalysis = widget.dataBindings.getDataBinding('dataBinding').getLinkedAnalysis();

    if (widget._selectedPoint && widget._selectedPoint !== point) {
        linkedAnalysis.removeFilters();
        widget._selectedPoint.select(false, false);
        widget._selectedPoint = null;
    }

    if (event.type === 'select') {
        if (selectedItem) {
            const selection = {};
            selection[dimensionId] = selectedItem[dimensionKey].id;
            linkedAnalysis.setFilters(selection);
            widget._selectedPoint = point;
        }
    } else if (event.type === 'unselect') {
        linkedAnalysis.removeFilters();
        widget._selectedPoint = null;
    }
}

/**
 * Sets up mouseenter/mouseleave listeners to toggle the exporting context button.
 * @param {HTMLElement} container - Chart container element in the shadow DOM.
 * @param {Highcharts.Chart} chart - Highcharts instance.
 */
export function setupContextButtonListeners(container, chart) {
    if (!container || !chart) return;
    container.addEventListener("mouseenter", () => {
        chart.update({
            exporting: {
                buttons: {
                    contextButton: {
                        enabled: true,
                        symbol: 'contextButton',
                        menuItems: ['resetFilters']
                    },
                },
            },
        }, true);
    });

    container.addEventListener("mouseleave", () => {
        chart.update({
            exporting: {
                buttons: {
                    contextButton: {
                        enabled: false,
                    },
                },
            },
        }, true);
    });
}