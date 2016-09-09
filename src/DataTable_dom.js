// 直接灌
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
        require('./dataTables.scroller');
        // fixedColumns 与 现有的select体系不能兼容
        require('./dataTables.fixedColumns');
        // colReorder 与 复合表头不能同时使用 会出bug
        require('./dataTables.colReorder');

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
                 *
                 * @public
                 * @param {Object} datasource 数据源
                 */
                setDatasource: function (datasource) {
                    this.datasource = datasource;
                    this.dataTable.clear();
                    var newData = u.map(datasource, function (source) {
                        return getSingleRowData(this, source);
                    }.bind(this));
                    this.dataTable.data().rows.add(newData);
                    this.dataTable.draw();
                    $('tr', this.dataTable.table().header()).removeClass('selected');
                    resetSelect(this, this.select);
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
                    return u.filter(this.datasource, function (source, index) {
                        return items.indexes().indexOf(index) >= 0;
                    });
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
                    this.dataTable.columns.adjust();
                },

                /**
                 * 重新绘制Table某行
                 *
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

                        rowEl.data(getSingleRowData(this, data)).draw();

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

                    $(dataTable.table().header()).on('click', 'th.sorting', function () {
                        var field = null;
                        var index = dataTable.column(this).index();
                        field = analysizeFields(that.fields).fields[index - 1];
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

                    dataTable.on('click', 'td.details-control', function (e) {
                        var index = dataTable.row(this).index();
                        var eventArgs = {
                            index: index,
                            item: dataTable.row(index).data()
                        };
                        $(dataTable.cell(this).node()).removeClass('details-control');
                        $(dataTable.cell(this).node()).addClass('details-control-open');
                        that.fire('subrowopen', eventArgs);
                    });

                    dataTable.on('click', 'td.details-control-open', function (e) {
                        var index = dataTable.row(this).index();
                        var eventArgs = {
                            index: index,
                            item: dataTable.row(index).data()
                        };
                        $(dataTable.cell(this).node()).removeClass('details-control-open');
                        $(dataTable.cell(this).node()).addClass('details-control');
                        that.fire('subrowclose', eventArgs);
                        dataTable.row(index).child().hide();
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
                    delegate(
                        dataTable, 'column-reorder',
                        this, 'columnreorder',
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
                        name: ['fields', 'datasource', 'foot'],
                        paint: function (table, fields, datasource, foot) {
                            if (table.dataTable) {
                                table.dataTable.destroy(true);
                            }
                            var isComplexHead = analysizeFields(fields).isComplexHead;
                            var headHTML = isComplexHead ? withComplexHeadHTML(fields)
                                            : simpleHeadHTML(fields);
                            var bodyHTML = createColumnHTML(datasource, fields);
                            var footHTML = createFooterHTML(table, null);
                            var cNode = $.parseHTML('<table class="display" cellspacing="0" width="100%">'
                                        + headHTML + footHTML +  bodyHTML + '</table>');
                            $(cNode).appendTo(table.main);
                            var options = {
                                info: false,
                                searching: false,
                                paging: false,
                                processing: true,
                                fixedHeader: true,
                                ordering: false,
                                scrollX: true,
                                scrollBarVis: true,
                                scrollCollapse: true,
                                language: {
                                    emptyTable: table.noDataHtml
                                },
                                // fixedColumns: {
                                //     leftColumns: table.leftFixedColumns,
                                //     rightColumns: table.rightFixedColumns
                                // },
                                colReorder: table.colReorder,
                                autoWidth: table.autoWidth,
                                columnDefs: getFieldsWith(table, fields)
                            };
                            var dataTable = $(cNode).DataTable(u.extend(options, table.extendOptions));
                            table.dataTable = dataTable;
                            table.helper.initChildren(dataTable.table().header());
                            resetSortable(table, table.sortable);
                            resetSelectMode(table, table.selectMode);
                            resetSelect(table, table.select);
                            resetFollowHead(table, table.followHead, table.followHeadOffset);
                            table.bindEvents();
                            table.adjustWidth();
                        }
                    },
                    {
                        name: 'selectMode',
                        paint: function (table, selectMode) {
                            resetSelectMode(table, selectMode);
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
                        name: ['followHead', 'followHeadOffset'],
                        paint: function (table, followHead, followHeadOffset) {
                            resetFollowHead(table, followHead, followHeadOffset);
                        }
                    },
                    {
                        // 一共四种格式
                        // 1. api: 只能通过api控制
                        // 2. multi
                        // 3. single
                        // 4. os: 可以shift/ctrl
                        name: 'select',
                        paint: function (table, select) {
                            resetSelect(table, select);
                        }
                    },
                    {
                        name: 'width',
                        paint: function (table, width) {
                            $(table.main).css('width', width);
                            table.adjustWidth();
                            table.fire('resize');
                        }
                    }
                ),

                setSubrowContent: function (content, index) {
                },

                getSubrowContainer: function (index) {
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

                addRowBuilders: function () {},

                addHandlers: function () {},

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

                    helper.dispose();
                    helper.afterDispose();
                }
            }
        );

        function getFieldsWith(table, fields) {
            var widths = [{
                width: table.selectColumnWidth,
                targets: 0
            }];

            var actualFields = analysizeFields(fields).fields;
            u.each(actualFields, function (field, index) {
                if (field.width) {
                    widths.push({
                        width: field.width,
                        targets: index + 1
                    });
                }
            });
            return widths;
        }

        function getSingleRowData(table, data) {
            var actualFields = analysizeFields(table.fields).fields;
            var updateData = [];
            updateData.push('');

            u.each(actualFields, function (field) {
                if (typeof field.content === 'function') {
                    updateData.push(field.content(data));
                }
                else {
                    updateData.push(data[field.field]);
                }
            });
            return updateData;
        }

        function resetSortable(table, sortable) {
            var theads = $('th', table.dataTable.table().header());
            if (!sortable) {
                theads.removeClass('sorting sorting_asc sorting_desc');
                return;
            }
            var actualFields = analysizeFields(table.fields).fields;
            u.each(theads, function (head, index) {
                var fieldId = $(head).attr('data-field-id');
                var fieldConfig = u.find(actualFields, function (field) {
                    return field.field === fieldId;
                });
                if (fieldConfig && fieldConfig.sortable) {
                    $(head).addClass('sorting');
                }
            });
        }

        function resetSelect(table, select) {
            table.dataTable.rows().deselect();

            var operationColumn = $(table.dataTable.column(0).nodes());
            operationColumn.removeClass('select-checkbox select-radio');
            $(table.dataTable.column(0).header()).removeClass('select-checkbox');

            if (!select) {
                select = 'api';
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

        function resetSelectMode(table, selectMode) {
            if (selectMode === 'box') {
                table.dataTable.select.selector('td:first-child');
            }
            else if (selectMode === 'line') {
                table.dataTable.select.selector('td');
            }
        }

        function resetFollowHead(table, followHead, followHeadOffset) {
            var fixedHeader = table.dataTable.fixedHeader;
            fixedHeader.enable(followHead);
            fixedHeader.headerOffset(followHeadOffset);
        }

        function resetFieldOrderable(table, orderBy, order) {
            orderBy = orderBy || table.orderBy;
            var theads = $('th', table.dataTable.table().header());
            var actualFields = analysizeFields(table.fields).fields;
            u.each(theads, function (head, index) {
                $(head).removeClass('sorting_asc sorting_desc');
                var fieldId = $(head).attr('data-field-id');
                var fieldConfig = u.find(actualFields, function (field) {
                    return field.field === fieldId;
                });
                if (fieldId === orderBy && table.sortable && fieldConfig && fieldConfig.sortable) {
                    $(head).addClass('sorting sorting_' + order);
                }
            });
        }

        function isAllRowSelected(table) {
            var datasource = table.datasource;
            var selectedItems = table.getSelectedItems();
            return selectedItems.length === datasource.length;
        }

        function analysizeFields(fields) {
            var actualFields = [];
            var isComplexHead = false;
            u.each(fields, function (field) {
                if (!field.children) {
                    actualFields.push(field);
                }
                else {
                    isComplexHead = true;
                    actualFields = actualFields.concat(field.children);
                }
            });
            return {
                isComplexHead: isComplexHead,
                fields: actualFields
            };
        }

        function getFieldHeaderClass(field) {
            return 'dt-head-' + (field.align || 'left');
        }
        function createHeadTitle(field) {
            return field.tip ? '<div '
                    + 'data-ui="type:Tip;content:' + field.tip + '">'
                    + '</div>' + field.title : field.title;
        }

        function withComplexHeadHTML(fields) {
            var HeadHTML = '<thead>';
            var html = ['<tr>'];
            html.push('<th rowspan="2" class="select-checkbox"></th>');
            var subHtml = ['<tr>'];
            u.each(fields, function (field) {
                if (!field.children) {
                    html.push('<th rowspan="2" class="' + getFieldHeaderClass(field)
                        + '" data-field-id="' + field.field + '">' + createHeadTitle(field) + '</th>');
                }
                else {
                    html.push('<th colspan="' + field.children.length + '">' + createHeadTitle(field) + '</th>');
                    u.each(field.children, function (child) {
                        subHtml.push('<th class="' + getFieldHeaderClass(child)
                            + '" data-field-id="' + child.field + '">' + createHeadTitle(child) + '</th>');
                    });
                }
            });
            html.push('</tr>');
            subHtml.push('</tr>');
            HeadHTML += html.join('');
            HeadHTML += subHtml.join('');
            HeadHTML += '</thead>';
            return HeadHTML;
        }

        function simpleHeadHTML(fields) {
            var HeadHTML = '<thead>';
            var html = ['<tr>'];
            html.push('<th rowspan="1" class="select-checkbox"></th>');
            u.each(fields, function (field) {
                html.push('<th rowspan="1" class="' + getFieldHeaderClass(field)
                        + '" data-field-id="' + field.field + '">' + createHeadTitle(field) + '</th>');
            });
            html.push('</tr>');
            HeadHTML += html.join('');
            HeadHTML += '</thead>';
            return HeadHTML;
        }

        function createColumnHTML(datasource, fields) {
            var actualFields = analysizeFields(fields).fields;
            var html = '<tbody>';
            var rows = [];
            u.each(datasource, function (source) {
                rows.push('<tr>');
                rows.push('<td class="select-checkbox"></td>');
                u.each(actualFields, function (field) {
                    var node = '<td class="dt-body-' + (field.align || 'left') + '">';
                    if (typeof field.content === 'function') {
                        node += field.content(source);
                    }
                    else {
                        node += field.content;
                    }
                    node += '</td>';
                    rows.push(node);
                });
                rows.push('</tr>');
            });
            return html + rows.join('') + '</tbody>';
        }

        function createFooterHTML(table, foot) {
            if (!foot) {
                return '';
            }

            var actualFields = analysizeFields(table.fields).fields;
            if (!(table.select === 'multi' || table.select === 'single')) {
                foot.unshift({});
            }
            foot = foot.slice(0, actualFields.length + 1);
            var lostLen = actualFields.length - foot.length;
            for (var i = 0; i < lostLen; i++) {
                foot.push({});
            }
            var html = '<tfoot><tr>';
            var rows = [];
            u.each(foot, function (item) {
                var content = item.content || '';
                if (typeof item.content === 'function') {
                    content = item.content();
                }

                rows.push('<th class="' + 'dt-head-' + (item.align || 'left')
                            + '" colspan=' + (item.colspan || 1) + '>'
                            + content
                            + '</th>');
            });
            return html + rows.join('') + '</tr></tfoot>';
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
            followHead: false,
            followHeadOffset: 0,
            sortable: false,
            select: '',
            selectMode: 'box',
            subEntry: false,
            autoWidth: false,
            selectColumnWidth: 35,
            colReorder: false,
            leftFixedColumns: 0,
            rightFixedColumns: 0
        };

        esui.register(DataTable);
        return DataTable;
    }
);
