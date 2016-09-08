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
        require('./dataTables.fixedColumns');

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
                },

                /**
                 * 设置所有行选中
                 *
                 * @param {boolean} isSelected 是否选中
                 * @public
                 */
                setAllRowSelected: function (isSelected) {
                },

                /**
                 * 获取Table的选中数据项
                 *
                 * @public
                 * @return {Array}
                 */
                getSelectedItems: function () {
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
                },

                /**
                 * 初始化表格体子控件
                 *
                 * @protected
                 * @param {number} index 行数
                 * @return {Element}
                 */
                getRow: function (index) {
                },

                 /**
                 * 自适应表格宽度
                 *
                 * @public
                 */
                adjustWidth: function () {
                },

                /**
                 * 重新绘制Table某行
                 * @param {number} index 行数
                 * @param {Object} data 该行对应的数据源
                 * @public
                 */
                updateRowAt: function (index, data) {
                },

                /**
                 * 初始化事件交互
                 *
                 * @protected
                 * @override
                 */
                bindEvents: function () {
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
                        name: ['fields', 'datasource', 'sortable'],
                        paint: function (table, fields, datasource, sortable) {
                            if (table.dataTable) {
                                table.dataTable.destroy(true);
                            }
                            var isComplexHead = analysizeFields(fields).isComplexHead;
                            var headHTML = isComplexHead ? withComplexHeadHTML(fields, sortable)
                                            : simpleHeadHTML(fields, sortable);
                            var bodyHTML = createColumnHTML(datasource, fields, sortable);
                            var cNode = $.parseHTML('<table class="display" cellspacing="0" width="100%">'
                                        + headHTML + bodyHTML + '</table>');
                            $(cNode).appendTo(table.main);
                            var dataTable = $(cNode).DataTable({
                                info: false,
                                searching: false,
                                paging: false,
                                processing: true,
                                fixedHeader: true,
                                // fixedColumns:   {
                                //     leftColumns: 1
                                // },
                                ordering: false,
                                scrollX: true,
                                scrollBarVis: true,
                                scrollCollapse: true,
                                language: {
                                    emptyTable: table.noDataHtml
                                },
                                autoWidth: table.autoWidth
                            });
                            table.dataTable = dataTable;
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

        function resetSortable(table, sortable) {
            var theads = $('th', table.dataTable.table().header());
            if (!sortable) {
                theads.removeClass('sorting sorting_asc sorting_desc');
                return;
            }
            u.each(table.fields, function (field, index) {
                if (field.sortable) {
                    $(theads[index]).addClass('sorting');
                }
            });
        }

        function resetSelect(table, select) {
            table.dataTable.rows().deselect();
            if (!select) {
                select = 'api';
            }
            table.dataTable.select.style(select);
        }

        function resetFollowHead (table, followHead, followHeadOffset) {
            var fixedHeader = table.dataTable.fixedHeader;
            fixedHeader.enable(followHead);
            fixedHeader.headerOffset(followHeadOffset);
        }

        function resetFieldOrderable(table, orderBy, order) {
            orderBy = orderBy || table.orderBy;
            var theads = $('th', table.dataTable.table().header());
            u.each(table.fields, function (field, index) {
                $(theads[index]).removeClass('sorting_asc sorting_desc');
                if (field.field === orderBy && field.sortable && table.sortable) {
                    $(theads[index]).addClass('sorting sorting_' + order);
                }
            });
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

        function fieldSortableClass(sortable, field) {
            var className = '';
            if (sortable && field.sortable) {
                className = 'sorting';
            }

            return className;
        }

        function withComplexHeadHTML(fields, sortable) {
            var HeadHTML = '<thead>'
            var html = ['<tr>'];
            var subHtml = ['<tr>'];
            u.each(fields, function (field) {
                if (!field.children) {
                    html.push('<th rowspan="2" class="' + fieldSortableClass(sortable, field) + '">' + field.title + '</th>');
                }
                else {
                    html.push('<th colspan="' + field.children.length + '"' + ' width="' + field.width +'px">' + field.title + '</th>');
                    u.each(field.children, function (child) {
                        subHtml.push('<th class="' + fieldSortableClass(sortable, child) + '">' + child.title + '</th>');
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

        function simpleHeadHTML(fields, sortable) {
            var HeadHTML = '<thead>'
            var html = ['<tr>'];
            u.each(fields, function (field) {
                html.push('<th rowspan="1" class="' + fieldSortableClass(sortable, field) + '">' + field.title + '</th>');
            });
            html.push('</tr>');
            HeadHTML += html.join('');
            HeadHTML += '</thead>';
            return HeadHTML
        }

        function createColumnHTML(datasource, fields) {
            var actualFields = analysizeFields(fields).fields;
            var html = '<tbody>';
            var rows = [];
            u.each(datasource, function (source) {
                rows.push('<tr>');
                u.each(actualFields, function (field) {
                    var node = '<td>';
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
            return html + rows.join('') + '</tbody>';;
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
            serverSide: false,
            ajaxUrl: null,
            ajaxData: {},
            ajaxMethod: 'GET'
        };

        esui.register(DataTable);
        return DataTable;
    }
);
