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
        // page客户端分页 与 全选 全不选 存在性能问题
        require('./dataTables');
        require('./dataTables.select');
        // !IMPORTANT
        // fixedColumns 一定要require在fixedHeader之前 否则会出bug
        require('./dataTables.fixedColumns');
        require('./dataTables.fixedHeader');
        require('./dataTables.scroller');
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
                    this.dataTable.data().rows.add(datasource);
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
                    // if (this.clientPaging) {
                    //     var info = this.dataTable.page.info();
                    //     var start = info.start;
                    //     var end = info.end;
                    //     for (var index = start; index < end; index++) {
                    //         isSelected ? this.dataTable.row(index).select() : this.dataTable.row(index).deselect();
                    //     }
                    //     return;
                    // }
                    isSelected ? this.dataTable.rows().select() : this.dataTable.rows().deselect();
                },

                /**
                 * 获取Table的选中数据项
                 *
                 * @public
                 * @return {Array}
                 */
                getSelectedItems: function () {
                    return this.dataTable.rows({selected: true}).data().toArray();
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
                    if (-1 < index && index < this.datasource.length && data) {
                        var oldData = this.datasource[index];
                        if (!u.isEqual(data, oldData)) {
                            var rowEl = this.dataTable.row(index);
                            this.fire(
                                'beforerowupdate',
                                {index: index, data: oldData, nextData: data}
                            );

                            this.datasource[index] = data;
                            rowEl.data(data).draw();

                            this.fire(
                                'afterrowupdate',
                                {index: index, data: data, prevData: oldData}
                            );
                        }
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
                    var header = dataTable.table().header();
                    var headerTr = $('tr', header);

                    var fixedColumnsDom = null;
                    if (dataTable.fixedColumns().settings()[0]._oFixedColumns) {
                        fixedColumnsDom = dataTable.fixedColumns().settings()[0]._oFixedColumns.dom;
                    }

                    if (this.select === 'multi') {
                        $('th.select-checkbox', header).on('click', function () {
                            headerTr.toggleClass('selected');
                            that.setAllRowSelected(headerTr.hasClass('selected'));
                            dataTable.fixedColumns().relayout();
                        });
                    }
                    dataTable.on('select', function (e, dt, type, indexes) {
                        if (isAllRowSelected(that)) {
                            headerTr.addClass('selected');
                        }
                        that.fire('select', {selectedIndex: dt.rows({selected: true}).indexes().toArray()});
                    });
                    dataTable.on('deselect', function (e, dt, type, indexes) {
                        headerTr.removeClass('selected');
                        that.fire('select', {selectedIndex: dt.rows({selected: true}).indexes().toArray()});
                        that.adjustWidth();
                    });

                    dataTable.on('page', function (e, dt) {
                        var info = dataTable.page.info();
                        // 从0开始
                        that.fire('page', {
                            page: info.page,
                            start: info.start,
                            end: info.end,
                            pageSize: info.length,
                            total: info.recordsTotal,
                            pages: info.pages
                        });
                    });

                    dataTable.on('column-reorder', function (e, settings, details) {
                        that.fire('columnreorder', {
                            from: details.from,
                            to: details.to
                        });
                        dataTable.fixedColumns().relayout();
                    });

                    if (fixedColumnsDom) {
                        $(fixedColumnsDom.header).on('click', 'th.sorting', function () {
                            var fieldId = $(this).attr('data-field-id');
                            var actualFields = analysizeFields(that.fields).fields;
                            var fieldConfig = u.find(actualFields, function (field) {
                                return field.field === fieldId;
                            });
                            if (fieldConfig && fieldConfig.sortable) {
                                var orderBy = that.orderBy;
                                var order = that.order;

                                if (orderBy === fieldConfig.field) {
                                    order = (!order || order === 'asc') ? 'desc' : 'asc';
                                }
                                else {
                                    order = 'desc';
                                }

                                that.setProperties({
                                    order: order,
                                    orderBy: fieldConfig.field
                                });

                                that.fire('sort', {field: fieldConfig, order: order});
                            }
                            dataTable.fixedColumns().relayout();
                        });
                    }
                    else {
                        $(header).on('click', 'th.sorting', function () {
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
                            dataTable.fixedColumns().relayout();
                        });
                    }

                    dataTable.on('click', 'td.details-control', function (e) {
                        var index = dataTable.row(this).index();
                        var eventArgs = {
                            index: index,
                            item: dataTable.row(index).data()
                        };
                        $(dataTable.cell(this).node()).removeClass('details-control');
                        $(dataTable.cell(this).node()).addClass('details-control-open');
                        that.fire('subrowopen', eventArgs);
                        dataTable.row(index).child().show();
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
                            var footHTML = createFooterHTML(table, foot);
                            var cNode = $.parseHTML('<table class="display" cellspacing="0" width="100%">'
                                        + headHTML + footHTML + '<tbody></tbody></table>');
                            $(cNode).appendTo(table.main);
                            var options = {
                                data: datasource,
                                info: false,
                                searching: false,
                                paging: table.clientPaging,
                                processing: true,
                                fixedHeader: true,
                                ordering: false,
                                scrollX: true,
                                scrollY: table.scrollY,
                                scrollBarVis: true,
                                scrollCollapse: true,
                                language: {
                                    emptyTable: table.noDataHtml,
                                    paginate: {
                                        previous: table.pagePrevious,
                                        next: table.pageNext
                                    },
                                    processing: table.processingText,
                                    lengthMenu: table.lengthMenu
                                },
                                fixedColumns: {
                                    leftColumns: table.leftFixedColumns,
                                    rightColumns: table.rightFixedColumns
                                },
                                colReorder: table.colReorder,
                                autoWidth: table.autoWidth,
                                columnDefs: getColumnDefs(table, fields)
                            };
                            var dataTable = $(cNode).DataTable(u.extend(options, table.extendOptions));
                            table.dataTable = dataTable;
                            table.helper.initChildren(dataTable.table().header());
                            resetBodyClass(table, fields);
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

        function getColumnDefs(table, fields) {
            var columns = [{
                data: null,
                defaultContent: '',
                width: table.selectColumnWidth,
                targets: 0
            }];

            var actualFields = analysizeFields(fields).fields;
            u.each(actualFields, function (field, index) {
                var column = {
                    data: field.content,
                    targets: index + 1
                };
                if (field.width) {
                    column.width = field.width;
                }
                columns.push(column);
            });
            return columns;
        }

        function resetBodyClass(table, fields) {
            var columnDefs = table.dataTable.settings()[0].aoColumns;
            var actualFields = analysizeFields(table.fields).fields;
            u.each(columnDefs, function (def, index) {
                var fieldId = def.fieldId;
                var fieldConfig = u.find(actualFields, function (field) {
                    return field.field === fieldId;
                });
                if (fieldConfig) {
                    var alignClass = 'dt-body-' + (fieldConfig.align || 'left');
                    $(table.dataTable.column(index).nodes()).addClass(alignClass);
                }
            });
        }

        function resetSortable(table, sortable) {
            var theads = $('th', table.dataTable.table().header());
            if (!sortable) {
                theads.removeClass('sorting sorting_asc sorting_desc');
                theads.find('i').remove();
                return;
            }
            var actualFields = analysizeFields(table.fields).fields;
            u.each(theads, function (head, index) {
                var fieldId = $(head).attr('data-field-id');
                var fieldConfig = u.find(actualFields, function (field) {
                    return field.field === fieldId;
                });
                if (fieldConfig && fieldConfig.sortable) {
                    $(head).find('i.ui-table-hsort').remove();
                    $(head).append('<i class="ui-table-hsort ui-icon"></i>');
                    $(head).addClass('sorting');
                }
                if (fieldConfig && !fieldConfig.sortable) {
                    $(head).find('i.ui-table-hsort').remove();
                }
            });
        }

        function resetSelect(table, select) {
            table.dataTable.rows().deselect();

            var operationColumn = $(table.dataTable.column(0).nodes());
            operationColumn.removeClass('select-checkbox select-radio');
            $(table.dataTable.column(0).header()).removeClass('select-checkbox');

            operationColumn.addClass('select-indicator');

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
            table.dataTable.select.style(select).fixedColumns().relayout();
        }

        function resetSelectMode(table, selectMode) {
            if (selectMode === 'box') {
                table.dataTable.select.selector('td:first-child.select-indicator');
            }
            else if (selectMode === 'line') {
                table.dataTable.select.selector('td');
            }
            table.dataTable.fixedColumns().relayout();
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
            for (var i = 0; i <= lostLen; i++) {
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
            return obj != null;
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
            rightFixedColumns: 0,
            clientPaging: false,
            processingText: '加载中...',
            pagePrevious: '上一页',
            pageNext: '下一页',
            scrollY: null,
            lengthMenu: '每页显示_MENU_'
        };

        esui.register(DataTable);
        return DataTable;
    }
);
