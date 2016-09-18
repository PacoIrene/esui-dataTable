/**
 * ESUI (Enterprise Simple UI)
 * Copyright 2016 Baidu Inc. All rights reserved.
 *
 * @ignore
 * @file 表格行内编辑扩展
 * @author hongfeng(hongfeng@baidu.com)
 */
define(
    function (require) {
        var Extension = require('esui/Extension');
        var esui = require('esui/main');
        var DataTable = require('./DataTable_dom');
        var $ = require('jquery');
        var eoo = require('eoo');
        require('./dataTables');
        require('./dataTables.select');
        require('./dataTables.fixedColumns');
        require('./dataTables.fixedHeader');
        require('./dataTables.scroller');
        require('./dataTables.colReorder');

        /**
         * 表格子行扩展
         *
         * @constructor
         */
        var TableSubrow = eoo.create(
            Extension,
            {
                /**
                 * 指定扩展类型，始终为`"TableSubrow"`
                 *
                 * @type {string}
                 */
                type: 'TableSubrow',

                /**
                 * 激活扩展
                 *
                 * @override
                 */
                activate: function () {
                    var target = this.target;
                    // 只对`Table`控件生效
                    if (!(target instanceof DataTable)) {
                        return;
                    }

                    var originalBindEvents = target.bindEvents;
                    target.bindEvents = function () {
                        originalBindEvents.call(target);

                        var dataTable = target.dataTable;
                        dataTable.on('click', 'td.details-control', function (e) {
                            var index = dataTable.row(this).index();
                            var row = dataTable.row(index);
                            var data = row.data();
                            var eventArgs = {
                                index: index,
                                item: data
                            };
                            var td = $(dataTable.cell(this).node());
                            td.removeClass('details-control');
                            td.addClass('details-control-open');
                            td.html('<span class="ui-icon-minus-circle ui-eicons-fw"></span>');
                            target.fire('subrowopen', eventArgs);
                            var subTableWrapper = $.parseHTML(''
                                + '<table class="display" cellspacing="0" width="100%">'
                                +     '<tbody></tbody>'
                                + '</table>');
                            var subTable = target.initDataTable(subTableWrapper, target, data.children, target.fields);
                            target.helper.initChildren(subTable.table().header());
                            row.child(subTableWrapper).show();
                            $(row.node()).next().find('>td').css('padding', 0);
                            target.resetBodyClass(target, target.fields, subTable);
                            target.resetSelectMode(target, target.selectMode, subTable);
                            target.resetSelect(target, target.select, subTable);
                            subTable.columns.adjust();
                        });

                        dataTable.on('click', 'td.details-control-open', function (e) {
                            var index = dataTable.row(this).index();
                            var eventArgs = {
                                index: index,
                                item: dataTable.row(index).data()
                            };
                            var td = $(dataTable.cell(this).node());
                            td.removeClass('details-control-open');
                            td.addClass('details-control');
                            td.html('<span class="ui-icon-plus-circle ui-eicons-fw"></span>');
                            target.fire('subrowclose', eventArgs);
                            dataTable.row(index).child().hide();
                        });
                    };
                },

                /**
                 * 取消扩展的激活状态
                 *
                 * @override
                 */
                inactivate: function () {
                    var target = this.target;
                    // 只对`Table`控件生效
                    if (!(target instanceof DataTable)) {
                        return;
                    }

                    this.$super(arguments);
                }
            }
        );

        esui.registerExtension(TableSubrow);
        return TableSubrow;
    }
);
