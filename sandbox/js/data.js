var Data = {
    colors : {
        header : 'Colors (Theme)',
        content : {
            sections : {
                text : {
                    label : 'Text Colors',
                    defs : [
                        {
                            id    : 'appText',
                            val   : '#282828',
                            usage : 'Generic body text',
                            label : 'App '
                        },
                        {
                            id    : 'ctaText',
                            val   : '#009ddc',
                            usage : 'Links',
                            label : 'CTA '
                        },
                        {
                            id    : 'contrastText',
                            val   : '#ff9900',
                            usage : 'Orange text - contrast',
                            label : 'Contrast '
                        },
                        {
                            id    : 'lightestText',
                            val   : '#FFF',
                            usage : 'White text on dark background',
                            label : 'Lightest'
                        },
                        {
                            id    : 'lightText',
                            val   : '#999',
                            usage : 'Field hints, disabled items',
                            label : 'Light'
                        },
                        {
                            id    : 'mediumText',
                            val   : '#666',
                            usage : 'Left nav, footer, overlays',
                            label : 'Medium'
                        },
                        {
                            id    : 'darkText',
                            val   : '#4c4c4c',
                            usage : 'Headers',
                            label : 'Dark'
                        }
                    ]
                },
                borders : {
                    label : 'Border Colors',
                    defs : [
                        {
                            id    : 'mediumBorder',
                            val   : '#cbcbcb',
                            usage : 'Generic border',
                            label : 'Medium '
                        },
                        {
                            id    : 'contrastBorder',
                            val   : '#ff9900',
                            usage : 'Contrast boxes',
                            label : 'Contrast '
                        }
                    ]
                },
                backgrounds : {
                    label : 'Background Colors',
                    defs : [
                        {
                            id    : 'appBg',
                            val   : '#f5f5f5',
                            usage : 'Page background',
                            label : 'App '
                        },
                        {
                            id    : 'navBg',
                            val   : '#181818',
                            usage : 'Left nav',
                            label : 'Nav '
                        },
                        {
                            id    : 'upsellBg',
                            val   : '#e1f7f5',
                            usage : 'Upsell messages and CTAs',
                            label : 'Upsell '
                        },
                        {
                            id    : 'contrastBg',
                            val   : '#ff9900',
                            usage : 'Contrast items',
                            label : 'Contrast '
                        },
                        {
                            id    : 'lightestBg',
                            val   : '#FFF',
                            usage : 'White background - sections',
                            label : 'Lightest'
                        },
                        {
                            id    : 'lighterBg',
                            val   : '#edeced',
                            usage : 'Event view header',
                            label : 'Lighter'
                        },
                        {
                            id    : 'lightBg',
                            val   : '#e0e0e0',
                            usage : 'Event view right pane, recommendation item bottom bar',
                            label : 'Light'
                        },
                        {
                            id    : 'mediumBg',
                            val   : '#7f7f7f',
                            usage : 'Active Tab, medium overlay on images',
                            label : 'Medium'
                        },
                        {
                            id    : 'darkBg',
                            val   : '#4c4c4c',
                            usage : 'Inactive Tab',
                            label : 'Dark'
                        },
                        {
                            id    : 'darkerBg',
                            val   : '#323232',
                            usage : 'Header, "we won\'t recommend..."',
                            label : 'Darker'
                        },
                        {
                            id    : 'darkestBg',
                            val   : '#292929',
                            usage : 'Dark overlay on images, tooltips',
                            label : 'Darkest'
                        }
                    ]
                }
            }
        }
    },
    buttons : {
        header : 'Colors (Theme)',
        content : {
            sections : {
                types : {
                    label : 'Types',
                    defs : [
                        {
                            id    : 'btn',
                            val   : 'btn',
                            usage : 'Generic button',
                            label : 'Button'
                        },
                        {
                            id    : 'btnDropdown',
                            val   : 'btn btnDropdown',
                            usage : 'Dropdowns',
                            label : 'Dropdown'
                        },
                        {
                            id    : 'ctaBtn',
                            val   : 'btn ctaBtn',
                            usage : 'Blue CTA button',
                            label : 'CTA'
                        },
                        {
                            id    : 'contrastBtn',
                            val   : 'btn contrastBtn',
                            usage : 'Orange button',
                            label : 'Contrast'
                        }
                    ]
                },
                sizes : {
                    label : 'Sizes',
                    defs : [
                        {
                            id    : 'btnSm',
                            val   : 'btn btnSm',
                            usage : 'Small buttons (inline)',
                            label : 'Small'
                        },
                        {
                            id    : 'btn',
                            val   : 'btn',
                            usage : 'Default size',
                            label : 'Default'
                        },
                        {
                            id    : 'btnLg',
                            val   : 'btn btnLg',
                            usage : 'Large size',
                            label : 'Large'
                        }
                    ]
                }
            }
        }
    }
};

var dataRendering = {
    colors: [
        {
            data : 'label',
            type : 'string',
            className : 'fixWCell'
        },
        {
            data : 'id',
            type : 'string',
            className : 'fixWCell classNameCell'
        },
        {
            data : 'val',
            type : 'hexVal'
        },
        {
            data : 'val',
            type : 'swatch'
        },
        {
            data : 'usage',
            type : 'string',
            className : 'usageCell'
        }

    ],
    buttons : [
        {
            data : 'label',
            type : 'string',
            className : 'fixWCell'
        },
        {
            data : 'id',
            type : 'string',
            className : 'fixWCell classNameCell'
        },
        {
            data : 'val',
            type : 'button'
        },
        {
            data : 'usage',
            type : 'string',
            className : 'usageCell'
        }
    ]
};