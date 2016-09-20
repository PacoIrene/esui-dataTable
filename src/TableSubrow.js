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
        var esui = require('esui/main');
        var Extension = require('esui/Extension');
        var eoo = require('eoo');
        var DataTable = require('./DataTable_dom');
        var $ = require('jquery');
        var _ = require('underscore');
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

                    function recursiveBind(target, dataTable, datasource, layer, parentIndexes) {
                        dataTable.on('click', 'td.details-control', function (e) {
                            var index = dataTable.row(this).index();
                            var indexes = parentIndexes.concat(index);
                            var row = dataTable.row(index);
                            var data = datasource[index];
                            var eventArgs = {
                                index: index,
                                item: data,
                                layer: layer,
                                indexes: indexes
                            };
                            var td = $(dataTable.cell(this).node());
                            td.removeClass('details-control');
                            td.addClass('details-control-open');
                            td.html('<span class="ui-icon-minus-circle ui-eicons-fw"></span>');
                            target.fire('subrowopen', eventArgs);

                            var subTable = $.parseHTML(''
                                + '<table class="display" cellspacing="0" width="100%">'
                                +     '<tbody></tbody>'
                                + '</table>');
                            var subDataTable = target.initDataTable(subTable, target, data.children, target.fields);
                            target.helper.initChildren(subDataTable.table().header());
                            row.child(subTable).show();
                            var colspan = _.filter(dataTable.context[0].aoColumns, function (column) {
                                return column.bVisible;
                            }).length;
                            $(row.node()).next().find('>td').css('padding', 0).attr('colspan', colspan);

                            target.resetBodyClass(target, target.fields, subDataTable);
                            target.resetSelectMode(target, target.selectMode, subDataTable);
                            target.resetSelect(target, target.select, subDataTable);
                            target.resetFollowHead(subDataTable, target.followHead, target.followHeadOffset);
                            subDataTable.columns.adjust();
                            recursiveBind(target, subDataTable, data.children, layer + 1, indexes);
                        });

                        dataTable.on('click', 'td.details-control-open', function (e) {
                            var index = dataTable.row(this).index();
                            var indexes = parentIndexes.concat(index);
                            var eventArgs = {
                                index: index,
                                item: datasource[index],
                                layer: layer,
                                indexes: indexes
                            };
                            var td = $(dataTable.cell(this).node());
                            td.removeClass('details-control-open');
                            td.addClass('details-control');
                            td.html('<span class="ui-icon-plus-circle ui-eicons-fw"></span>');
                            target.fire('subrowclose', eventArgs);
                            dataTable.row(index).child().hide();
                        });
                    }

                    target.bindEvents = function () {
                        originalBindEvents.call(target);

                        var dataTable = target.dataTable;
                        var layer = 0;
                        recursiveBind(target, dataTable, target.datasource, layer + 1, []);
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
