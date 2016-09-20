/**
 * ESUI (Enterprise Simple UI)
 * Copyright 2016 Baidu Inc. All rights reserved.
 *
 * @ignore
 * @file TreeGrid
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
        var TreeGrid = eoo.create(
            Extension,
            {
                /**
                 * 指定扩展类型，始终为`"TreeGrid"`
                 *
                 * @type {string}
                 */
                type: 'TreeGrid',

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
                        var treeGridRows = {};
                        var minusIcon = $('<span class="ui-icon-minus-circle ui-eicons-fw"></span>');
                        var plusIcon = $('<span class="ui-icon-plus-circle ui-eicons-fw"></span>');

                        dataTable.on('click', 'td.treegrid-control', function (e) {
                            var row = dataTable.row(this);
                            var index = row.index();
                            var data = row.data();
                            var eventArgs = {
                                index: index,
                                item: data
                            };
                            target.fire('treegridopen', eventArgs);

                            var td = $(dataTable.cell(this).node());
                            var paddingLeft = parseInt(td.css('padding-left'), 10);
                            var layer = parseInt(td.find('span').css('margin-left') || 0, 10) / 12;
                            var icon = minusIcon.clone();
                            icon.css('marginLeft', layer * 12 + 'px');
                            td.removeClass('treegrid-control').addClass('treegrid-control-open');
                            td.html('').append(icon);

                            if (data.children && data.children.length) {
                                var subRows = treeGridRows[index] = [];
                                var nextRow = dataTable.row(index + 1);
                                data.children.forEach(function (item) {
                                    var newRow = dataTable.row.add(item);
                                    var node = newRow.node();
                                    var treegridTd = $(node).find('.treegrid-control');
                                    var left = (layer + 1) * 12;
                                    treegridTd.find('span').css('marginLeft', left + 'px');
                                    treegridTd.next().css('paddingLeft', paddingLeft + left + 'px');
                                    $(node).insertBefore(nextRow.node());
                                    subRows.push(node);
                                });
                                target.resetBodyClass(target, target.fields);
                                resetEvenOddClass(dataTable);
                            }
                        });

                        dataTable.on('click', 'td.treegrid-control-open', function (e) {
                            var row = dataTable.row(this);
                            var index = row.index();
                            var data = row.data();
                            var eventArgs = {
                                index: index,
                                item: data
                            };
                            row.treegridopen = false;
                            target.fire('treegridclose', eventArgs);

                            var td = $(dataTable.cell(this).node());
                            var layer = parseInt(td.find('span').css('margin-left') || 0, 10) / 12;
                            var icon = plusIcon.clone();
                            icon.css('marginLeft', layer * 12 + 'px');
                            td.removeClass('treegrid-control-open').addClass('treegrid-control');
                            td.html('').append(icon);

                            var subRows = treeGridRows[index];
                            if (subRows && subRows.length) {
                                subRows.forEach(function (node) {
                                    dataTable.row($(node)).remove();
                                    $(node).remove();
                                });
                                delete treeGridRows[index];
                            }
                            resetEvenOddClass(dataTable);
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

        function resetEvenOddClass(dataTable) {
            var classes = ['odd', 'even'];
            $(dataTable.table().body()).find('tr').each(function (index, tr) {
                $(tr).attr('class', classes[index % 2]);
            });
        }

        esui.registerExtension(TreeGrid);
        return TreeGrid;
    }
);
