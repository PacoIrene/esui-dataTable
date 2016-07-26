define(
    function (require) {
        var u = require('underscore');
        var lib = require('esui/lib');
        var Control = require('esui/Control');
        var painters = require('esui/painters');
        var esui = require('esui/main');
        var eoo = require('eoo');
        var $ = require('jquery');
        var Event = require('mini-event');
        require('./dataTables');
        require('./dataTables.select');
        require('./dataTables.fixedHeader');

        var DataTable = eoo.create(
            Control,
            {
                /**
                 * 控件类型，始终为`"DataTable"`
                 *
                 * @type {string}
                 * @readonly
                 * @override
                 */
                type: 'DataTable',

                /**
                 * 初始化参数
                 *
                 * 如果初始化时提供了主元素，则使用主元素的标签名作为{@link DataTable#tagName}属性
                 *
                 * 如果未提供{@link DataTable#text}属性，则使用主元素的文本内容作为此属性的初始值
                 *
                 * @param {Object} [options] 构造函数传入的参数
                 * @override
                 * @protected
                 */
                initOptions: function (options) {
                    var properties = {
                        handlers: []
                    };

                    u.extend(properties, DataTable.defaultProperties, options, options.extendOptions);
                    this.setProperties(properties);
                },

                initStructure: function () {
                },

                /**
                 * 设置Table的datasource，并强制更新
                 * @public
                 * @param {Object} datasource 数据源
                 */
                setDatasource: function (datasource) {
                    this.datasource = datasource;
                    this.dataTable.clear();
                    this.dataTable.data().rows.add(datasource);
                    this.dataTable.draw();
                    $('tr', this.dataTable.table().header()).removeClass('selected');
                    this.fire('bodyChange');
                    this.fire('select', {selectedIndex: []});
                },

                /**
                 * 设置所有行选中
                 *
                 * @param {boolean} isSelected 是否选中
                 * @public
                 */
                setAllRowSelected: function (isSelected) {
                    if (this.select !== 'multi') {
                        return;
                    }
                    isSelected ? this.dataTable.rows().select() : this.dataTable.rows().deselect();
                },

                /**
                 * 获取Table的选中数据项
                 *
                 * @public
                 * @return {Array}
                 */
                getSelectedItems: function () {
                    var items = this.dataTable.rows({selected: true});
                    return items.data().toArray();
                },

                /**
                 * 设置单元格的文字
                 *
                 * @public
                 * @param {string} text 要设置的文字
                 * @param {string} rowIndex 行序号
                 * @param {string} columnIndex 列序号
                 * @param {boolean=} isEncodeHtml 是否需要进行html转义
                 */
                setCellText: function (text, rowIndex, columnIndex, isEncodeHtml) {
                    if (isEncodeHtml) {
                        text = u.escape(text);
                    }
                    text = isNullOrEmpty(text) ? '&nbsp' : text;
                    var cell = this.dataTable.cell(rowIndex, columnIndex);
                    cell.node().innerHTML = text;
                },

                /**
                 * 初始化表格体子控件
                 *
                 * @protected
                 * @param {number} index 行数
                 * @return {Element}
                 */
                getRow: function (index) {
                    return this.dataTable.row(index).node();
                },

                 /**
                 * 自适应表格宽度
                 *
                 * @public
                 */
                adjustWidth: function () {
                    // TODO: 一旦draw了就整个重绘了 代价是不是有点大？
                    // this.dataTable.columns.adjust().draw();
                },

                /**
                 * 重新绘制Table某行
                 * @param {number} index 行数
                 * @param {Object} data 该行对应的数据源
                 * @public
                 */
                updateRowAt: function (index, data) {
                    (data) && (this.datasource[index] = data);
                    var dataItem = this.datasource[index];
                    var rowEl = this.dataTable.row(index);

                    if (dataItem && rowEl.length) {
                        this.fire(
                            'beforerowupdate',
                            {index: index, data: dataItem}
                        );

                        rowEl.data(data).draw();

                        this.fire(
                            'afterrowupdate',
                            {index: index, data: dataItem}
                        );
                    }
                },

                /**
                 * 初始化事件交互
                 *
                 * @protected
                 * @override
                 */
                bindEvents: function () {
                    var that = this;
                    var dataTable = this.dataTable;
                    if (this.select === 'multi') {
                        $('th.select-checkbox', dataTable.table().header()).on('click', function () {
                            $('tr', dataTable.table().header()).toggleClass('selected');
                            that.setAllRowSelected($('tr', dataTable.table().header()).hasClass('selected'));
                        });
                    }
                    dataTable.on('select', function (e, dt, type, indexes) {
                        if (isAllRowSelected(that)) {
                            $('tr', dataTable.table().header()).addClass('selected');
                        }
                        that.fire('select', {selectedIndex: dt.rows({selected: true}).indexes().toArray()});
                    });
                    dataTable.on('deselect', function (e, dt, type, indexes) {
                        $('tr', dataTable.table().header()).removeClass('selected');
                        that.fire('select', {selectedIndex: dt.rows({selected: true}).indexes().toArray()});
                    });

                    $(dataTable.table().header()).on('click', 'th.sorting', function() {
                        var field = null;
                        var index = dataTable.column(this).index();
                        field = that.fields[index - 1];
                        if (field.sortable) {
                            var orderBy = that.orderBy;
                            var order = that.order;

                            if (orderBy === field.field) {
                                order = (!order || order === 'asc') ? 'desc' : 'asc';
                            }
                            else {
                                order = 'desc';
                            }

                            that.setProperties({
                                order: order,
                                orderBy: field.field
                            });

                            that.fire('sort', {field: field, order: order});
                        }
                    });

                    dataTable.on('click', 'td.details-control', function(e) {
                        var index = dataTable.row(this).index();
                        var eventArgs = {
                            index: index,
                            item: dataTable.row(index).data()
                        }
                        $(dataTable.cell(this).node()).removeClass('details-control');
                        $(dataTable.cell(this).node()).addClass('details-control-open');
                        that.fire('subrowopen', eventArgs);
                    });

                    dataTable.on('click', 'td.details-control-open', function(e) {
                        var index = dataTable.row(this).index();
                        var eventArgs = {
                            index: index,
                            item: dataTable.row(index).data()
                        }
                        $(dataTable.cell(this).node()).removeClass('details-control-open');
                        $(dataTable.cell(this).node()).addClass('details-control');
                        that.fire('subrowclose', eventArgs);
                        dataTable.row(index).child().hide();
                    });

                    dataTable.on('click', 'td.column-editable', function(e) {
                        var rowIndex = dataTable.row(e.currentTarget).index();
                        var columnIndex = dataTable.column(e.currentTarget).index();
                        if (that.select === 'multi' || that.select === 'single') {
                            actualColumnIndex = columnIndex - 1;
                        }

                        var data = dataTable.data()[rowIndex];
                        var field = that.fields[actualColumnIndex];
                        console.log(data[field.field])

                    });

                    var delegate = Event.delegate;
                    delegate(
                        dataTable, 'startdrag',
                        this, 'startdrag',
                        {preserveData: true, syncState: true}
                    );
                    delegate(
                        dataTable, 'startdrag',
                        this, 'dragstart',
                        {preserveData: true, syncState: true}
                    );
                    delegate(
                        dataTable, 'enddrag',
                        this, 'dragend',
                        {preserveData: true, syncState: true}
                    );
                    delegate(
                        dataTable, 'enddrag',
                        this, 'enddrag',
                        {preserveData: true, syncState: true}
                    );
                    this.helper.addDOMEvent(window, 'resize', u.bind(function (e) {
                        this.adjustWidth();
                        this.fire('resize');
                    }, this));
                },

                /**
                 * 渲染自身
                 *
                 * @override
                 * @protected
                 */
                repaint: painters.createRepaint(
                    Control.prototype.repaint,
                    {
                        name: ['fields', 'datasource'],
                        paint: function (table, fields, datasource) {
                            renderFields(table, fields);
                            table.helper.initChildren(table.dataTable.table().header());
                            if (!table.serverSide) {
                                table.setDatasource(table.datasource);
                            }
                            renderFoot(table, table.foot);
                            // 一旦fixheader设定为true的时候，假如head的位置恰好能够fixed
                            // 会出现neck无法显示的问题
                            //     是因为renderNeck的方法里去找header的时候找到的其实是fixheader
                            //     伪造的那个header 而不是原有位置上的那个header
                            // renderNeck(table, table.neck);
                            resetSortable(table, table.sortable);
                            resetSelectMode(table, table.selectMode);
                            resetSelect(table, table.select);
                            resetFollowHead(table, table.followHead, table.followHeadOffset);
                            table.bindEvents();
                            table.adjustWidth();
                        }
                    },
                    {
                        name: ['foot', 'neck'],
                        paint: function (table, foot, neck) {
                            renderFoot(table, table.foot);
                            // renderNeck(table, table.neck);
                        }
                    },
                    {
                        name: 'width',
                        paint: function (table, width) {
                            $(table.main).css('width', width);
                            table.fire('resize');
                        }
                    },
                    {
                        name: 'sortable',
                        paint: function (table, sortable) {
                            resetSortable(table, sortable);
                        }
                    },
                    {
                        name: ['orderBy', 'order'],
                        paint: function (table, orderBy, order) {
                            resetFieldOrderable(table, orderBy, order);
                        }
                    },
                    {
                        name: 'followHead',
                        paint: function (table, followHead, followHeadOffset) {
                            resetFollowHead(table, followHead, followHeadOffset);
                        }
                    },
                    {
                        name: 'selectMode',
                        paint: function (table, selectMode) {
                            resetSelectMode(table, selectMode);
                        }
                    },
                    {
                        name: 'select',
                        paint: function (table, select) {
                            resetSelect(table, select);
                        }
                    }
                ),

                setSubrowContent: function (content, index) {
                    // var subrowPanel = this.getChild('subrow-panel-' + index);
                    // if (subrowPanel) {
                    //     subrowPanel.setContent(content);
                    //     this.dataTable.row(index).child().show();
                    // }
                    // else {
                    //     var tpl = '<div data-ui-type="Panel" data-ui-id="subrow-panel-' + index + '" data-ui-group="subrowPanel"></div>';
                    //     this.dataTable.row(index).child(tpl).show();
                    //     this.initChildren(this.dataTable.row(index).child()[0]);
                    //     subrowPanel = this.viewContext.get('subrow-panel-' + index);
                    //     this.addChild(subrowPanel, 'subrow-panel-' + index);
                    //     subrowPanel.setContent(content);
                    // }
                    this.dataTable.row(index).child(content).show();
                },

                getSubrowContainer: function (index) {
                    return this.getChild('subrow-panel-' + index);
                },

                /**
                 * 设置行选中
                 *
                 * @param {number|Array} index 行号
                 * @param {boolean} isSelected 是否选中
                 * @public
                 */
                setRowSelected: function (index, isSelected) {
                    if (this.select !== 'multi' && this.select !== 'single') {
                        return;
                    }
                    isSelected ? this.dataTable.row(index).select() : this.dataTable.row(index).deselect();
                    if (isAllRowSelected(this)) {
                        $('tr', this.dataTable.table().header()).addClass('selected');
                    }
                    else {
                        $('tr', this.dataTable.table().header()).removeClass('selected');
                    }
                },

                /**
                 * 销毁释放控件
                 *
                 * @override
                 */
                dispose: function () {
                    var helper = this.helper;
                    if (helper.isInStage('DISPOSED')) {
                        return;
                    }
                    this.disposeChildren();

                    helper.beforeDispose();
                    this.dataTable.destroy(true);
                    this.dataTable = null;

                    this.rowBuilderList = null;


                    helper.dispose();
                    helper.afterDispose();
                }
            }
        );

        function resetFollowHead (table, followHead, followHeadOffset) {
            var fixedHeader = table.dataTable.fixedHeader;
            fixedHeader.enable(followHead);
            fixedHeader.headerOffset(followHeadOffset);
        }

        function resetSelect(table, select) {
            table.dataTable.rows().deselect();
            var operationColumn = $(table.dataTable.column(0).nodes());
            operationColumn.removeClass('select-checkbox select-radio');
            $(table.dataTable.column(0).header()).removeClass('select-checkbox');

            if (!select) {
                table.dataTable.select.selector('fakeNodeCanNeverGet');
                table.dataTable.column(0).visible(false);
            }
            else {
                table.dataTable.column(0).visible(true);
                resetSelectMode(table, table.selectMode);
            }
            if (select === 'multi') {
                $(table.dataTable.column(0).header()).addClass('select-checkbox');
                operationColumn.addClass('select-checkbox');
            }
            else if (select === 'single') {
                operationColumn.addClass('select-radio');
            }
            table.dataTable.select.style(select);
        }

        function resetFieldOrderable(table, orderBy, order) {
            orderBy = orderBy || table.orderBy;
            var theads = $('th', table.dataTable.header());
            u.each(table.fields, function (field, index) {
                var actualIndex = index;
                if (table.select === 'multi' || table.select === 'single') {
                    actualIndex = index + 1;
                }
                $(theads[actualIndex]).removeClass('sorting_asc sorting_desc');
                if (field.field === orderBy && field.sortable && table.sortable) {
                    $(theads[actualIndex]).addClass('sorting sorting_' + order);
                }
            });
        }

        function resetSortable(table, sortable) {
            var theads = $('th', table.dataTable.header());
            if (!sortable) {
                theads.removeClass('sorting sorting_asc sorting_desc');
                // return;
            }
            u.each(table.fields, function (field, index) {
                var actualIndex = index;
                if (table.select === 'multi' || table.select === 'single') {
                    actualIndex = index + 1;
                }
                if (field.sortable) {
                    $(theads[actualIndex]).addClass('sorting');
                }
            });
        }

        function renderFields(table, fields) {
            if (table.dataTable) {
                table.dataTable.destroy(true);
            }
            var cNode = document.createElement('table');
            $(cNode).appendTo(table.main);
            var options = {
                columnDefs: getInfoFromField(table, fields, table.select),
                info: false,
                searching: false,
                paging: false,
                fixedHeader: table.followHead,
                processing: true,
                dom: 'Zlfrtip',
                ordering: false,
                language: {
                    emptyTable: table.noDataHtml
                },
                scrollX: true,
                scrollBarVis: true,
                scrollCollapse: true,
                autoWidth: table.autoWidth,
                preDrawCallback: preDrawCallback
            };
            if (table.select) {
                options.select = {
                    style: table.select
                }
            }
            if (table.serverSide) {
                options.serverSide = table.serverSide;
                options.ajax = {
                    url: table.ajaxUrl,
                    type: table.ajaxMethod,
                    data: function(data) {
                        for (var key in data) {
                            if (data.hasOwnProperty(key)) {
                                delete data[key];
                            }
                        }
                        u.extend(data, table.ajaxData)
                    }
                }
            }
            var dataTable = $(cNode).DataTable(options);
            table.dataTable = dataTable;
            // $(cNode).css('min-width', '100%');
            $(cNode).addClass('display');
        }

        /**
         * 生成表格foot
         *
         * @private
         * @param {ui.Table} table table控件实例
         * @return {string}
         */
        function renderFoot(table, foot) {
            if (foot) {
                var footer = $('[data-role="foot"]', table.main);
                if (footer.length === 0) {
                    footer = document.createElement('tbody');
                    var body = table.dataTable.table().body();
                    $(footer).insertAfter(body);
                    $(footer).attr('data-role', 'foot');
                }
                $(footer).empty();
                $(footer).html(getFootOrNeckHtml(table, foot, 'foot'));
            }
        }

        /**
         * 生成表格neck
         *
         * @private
         * @param {ui.Table} table table控件实例
         * @return {string}
         */
        function renderNeck(table, neck) {
            if (neck) {
                var necker = $('[data-role="neck"]', table.main);
                if (necker.length === 0) {
                    necker = document.createElement('tbody');
                    var header = table.dataTable.table().header();
                    $(necker).insertAfter(header);
                    $(necker).attr('data-role', 'neck');
                }
                $(necker).empty();
                $(necker).html(getFootOrNeckHtml(table, neck, 'neck'));
            }
        }

        function preDrawCallback(settings) {
            if (!settings.oInit.autoWidth) {
                $('table.dataTable', settings.nTableWrapper).css('table-layout', 'fixed');
            }
        }

        /**
         * 获取表格尾的html
         *
         * @private
         * @param {ui.Table} table table控件实例
         * @return {string}
         */
        function getFootOrNeckHtml(table, options, type) {
            var html = [];
            for (var i = 0; i< options.length; i++) {
                var itemOption = options[i];
                var content = itemOption.content || '';
                if (typeof itemOption.content === 'function') {
                    content = itemOption.content();
                }
                var align = (itemOption.align || 'left');
                var className = 'dt-body-' + align;

                html.push('<td ' + 'colspan=' + (itemOption.colspan || 1)
                            + ' class=' + className + '>'
                            + content
                            + '</td>');
            }
            return options.length ? '<tr>' + html.join('') + '</tr>' : '';
        }
    
        function resetSelectMode(table, selectMode) {
            if (selectMode === 'box') {
                table.dataTable.select.selector('td:first-child');
            }
            else if (selectMode === 'line') {
                table.dataTable.select.selector('td');
            }
        }

        function isAllRowSelected(table) {
            var datasource = table.datasource;
            var selectedItems = table.getSelectedItems();
            return selectedItems.length === datasource.length;
        }

        function getInfoFromField(table, fields, select) {
            function getClassNameForColumn(field) {
                var className = '';
                if (table.autoWidth) {
                    className = 'dt-head-nowrap';
                }
                var align = field.align || 'left';
                className += (' dt-head-' + align + ' dt-body-' + align);
                if (field.subEntry) {
                    className += ' details-control';
                }

                if (field.editable) {
                    className += ' column-editable';
                }

                return className;
            }

            var defs = u.map(fields, function (field, index) {
                var option = {
                    targets: index + 1,
                    title: field.tip ? '<div '
                                + 'data-ui="type:Tip;content:'+ field.tip + '">'
                                + '</div>' + field.title : field.title,
                    data: field.content,
                    // 似乎单独的设置了就自动排序了
                    // orderable: field.sortable || false,
                    // orderData: [],
                    className: getClassNameForColumn(field)
                };
                if (field.width && !table.autoWidth) {
                    option.width = field.width;
                }
                else {
                    option.width = 'auto';
                }
                return option;
            });

            var className = 'select-checkbox';
            if (select === 'single') {
                className = 'select-radio';
            }
            defs.unshift({
                title: '',
                orderable: false,
                data: function() {
                    return '';
                },
                className: table.datasource.length === 0 ? '' : className,
                targets: 0,
                width: '15px'
            });
            return defs;
        }

        /**
         * 判断值是否为空
         *
         * @private
         * @param {Object} obj 要判断的值
         * @return {bool}
         */
        function hasValue(obj) {
            return !(typeof obj === 'undefined' || obj === null);
        }

        /**
         * 判断值是否为空,包括空字符串
         *
         * @private
         * @param {Object} obj 要判断的值
         * @return {bool}
         */
        function isNullOrEmpty(obj) {
            return !hasValue(obj) || !obj.toString().length;
        }

        /**
         * 默认属性值
         *
         * @type {Object}
         * @public
         */
        DataTable.defaultProperties = {
            noDataHtml: '没有数据',
            followHead: true,
            followHeadOffset: 0,
            sortable: false,
            select: '',
            selectMode: 'box',
            subEntry: false,
            autoWidth: false,
            serverSide: false,
            ajaxUrl: null,
            ajaxData: {},
            ajaxMethod: 'GET'
        };

        esui.register(DataTable);
        return DataTable;
    }
);
