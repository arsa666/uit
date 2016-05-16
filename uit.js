'use strict';

var Uit = {};

/**if developer wants to apply his/her own rivets rules, then include that file before uit.js
 and make window.customRivets === true. **/
if (window.rivets && _.isUndefined(window.customRivets)) {
    (function () {

        rivets.configure({
            // Attribute prefix in templates
            prefix: 'rv',

            // Preload templates with initial data on bind
            preloadData: true,

            // Root sightglass interface for keypaths
            rootInterface: '.',

            // Template delimiters for text bindings
            templateDelimiters: ['{', '}'],
            // Augment the event handler of the on-* binder
            handler: function (target, event, binding) {
                this.call(binding.view.models, target, event);
            }
        });

        rivets.adapters[':'] = {
            observe: function (obj, keypath, callback) {
                obj.on('change:' + keypath, callback);
            },
            unobserve: function (obj, keypath, callback) {
                obj.off('change:' + keypath, callback);
            },
            get: function (obj, keypath) {
                return obj.get(keypath);
            },
            set: function (obj, keypath, value) {
                obj.set(keypath, value);
            }
        };

        rivets.formatters.currency = {
            read: function (value) {
                var valueFloat = parseFloat(value);
                return (valueFloat) ? valueFloat.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0.00';
            },
            publish: function (value) {
                return parseFloat(value);
            }
        };

        // Allow to change the state of an input type check at checked on the DOM
        rivets.binders.util_checked = function (el, value) {
            var element = $(el);
            if (value === 1 || value === 1) {
                element.prop('checked', true);
            } else {
                element.prop('checked', false);
            }
        };

        rivets.formatters.formatterHtml = function (value) {
            var textarea = $('<textarea>' + value + '</textarea>');
            return textarea.val().replace(/\r\n|\r|\n/g, '<br /> ');
        };
    })();
}

Uit.ViewComponents = {
    _getAttributeByRivetsValue: function (rvValue, typeAttribute) {
        var arrayObject = rvValue.split(':'),
            reference = '';

        if (typeAttribute === 'model') {
            reference = _.first(arrayObject);
        } else if (typeAttribute === 'attribute') {
            reference = _.last(arrayObject);
        }
        return reference;
    },
    /** Return the value of model related with an attribute rv-value of a datepicker */
    _getValueFromModelOfRivetsValue: function (rvValue) {
        var stringModel = this._getAttributeByRivetsValue(rvValue, 'model'),
            attribute = this._getAttributeByRivetsValue(rvValue, 'attribute'),
            model = window.s.startsWith(stringModel, 'options') ? this.options[stringModel.substr(8, stringModel.length)] : this[stringModel];

        return model.get(attribute);
    },
    _setValueModelFromRivetsValue: function (rvValue, value) {
        var stringModel = this._getAttributeByRivetsValue(rvValue, 'model'),
            attribute = this._getAttributeByRivetsValue(rvValue, 'attribute'),
            model = window.s.startsWith(stringModel, 'options') ? this.options[stringModel.substr(8, stringModel.length)] : this[stringModel];

        model.set(attribute, value);
    }
};

Uit.ViewComponents.Timepicker = {
    handlerTimePicker: function () {
        var el = this.$el,
            that = this;

        el.find('.timepicker').timepicker().on('changeTime.timepicker', function (e) {
            var element = $(e.currentTarget),
                rvValue = element.attr('rv-value');

            var stringModel = that._getAttributeByRivetsValue(rvValue, 'model');
            var attribute = that._getAttributeByRivetsValue(rvValue, 'attribute');

            var model = window.s.startsWith(stringModel, 'options') ? that.options[stringModel.substr(8, stringModel.length)] : that[stringModel];
            model.set(attribute, e.time.value);
        });


        this.$el.find('.timepicker').each(function () {
            var element = $(this),
                rvValue = element.attr('rv-value');

            if (rvValue) {
                var value = that._getValueFromModelOfRivetsValue(rvValue);
                if (_.isEmpty(value)) {
                    if (!_.isUndefined(element.data('default-time')) || !_.isUndefined(element.attr('default-time'))) {
                        var time = element.timepicker('updateElement');
                        that._setValueModelFromRivetsValue(rvValue, time.val());
                    } else {
                        element.timepicker('setTime', '');
                    }
                } else {
                    if (value[0] === '1' && value[1] === '2') {//timepicker lib has a bug where it does not convert 12:00:00 to proper 12:00 PM.
                        value += ' PM';
                    }
                    element.timepicker('setTime', value);
                }
            }
        });
    }
};

Uit.ViewComponents.Datepicker = {
    watchChangeDatepicker: true,
    _handlerUpdateModelFromDatepicker: function (element, checkValidFormat) {
        var value = element.val();
        var rvValue = element.attr('rv-value');
        if (checkValidFormat) {
            value = (value.indexOf('_') < 0) ? value : '';
        }
        if (_.isUndefined(rvValue)) {
            return;
        }

        if (this._getValueFromModelOfRivetsValue(rvValue) !== value) {
            this._setValueModelFromRivetsValue(rvValue, value);
        }
    },
    handlerDatePicker: function () {
        var el = this.$el,
            self = this;

        el.find('.datepicker').datepicker({
            autoclose: true,
            format: 'yyyy-mm-dd',
            todayHighlight: true,
            forceParse: false
        });

        // Events to update the value of each model attribute
        el.find('.datepicker').on('changeDate', function (event) {
            var element = $(event.currentTarget);
            self._handlerUpdateModelFromDatepicker(element, false);
        });

        el.find('.datepicker').on('hide', function (event) {
            var element = $(event.currentTarget);
            self._handlerUpdateModelFromDatepicker(element, true);
        });

        this.objetModels = {};
        el.find('.datepicker').each(function () {
            var rvValue = $(this).attr('rv-value');

            if (_.isUndefined(rvValue)) {
                return;
            }

            var modelName = self._getAttributeByRivetsValue(rvValue, 'model');
            var attribute = 'change:' + self._getAttributeByRivetsValue(rvValue, 'attribute');
            if (!_.has(self.objetModels, modelName)) {
                self.objetModels[modelName] = [attribute];
            } else {
                self.objetModels[modelName].push(attribute);
            }
        });

        _.each(this.objetModels, function (values, stringModel) {
            var model = window.s.startsWith(stringModel, 'options') ? self.options[stringModel.substr(8, stringModel.length)] : self[stringModel],
                attributes = values.join(' ');

            self.listenTo(model, attributes, function (model) {
                if (self.watchChangeDatepicker) {
                    _.each(_.keys(model.changed), function (field) {
                        if (self.$el.find('[name=' + field + ']').hasClass('datepicker')) {
                            if (model.changed[field] !== self.$el.find('[name=' + field + ']').datepicker('getDate')) {
                                self.$el.find('[name=' + field + ']').datepicker('setDate', model.changed[field]);
                            }
                        }
                    });
                } else {
                    self.watchChangeDatepicker = true;
                }
            });
        });

        this._handlerDatepickerFromModel();

        _.extend(this.events, {
            'keypress .datepicker': function () {
                this.watchChangeDatepicker = false;
            },
            'keydown .datepicker': function (event) {
                if (event.keyCode === 8) {
                    this.watchChangeDatepicker = false;
                } else {
                    this.watchChangeDatepicker = true;
                }
            }
        });

        this.delegateEvents(this.events);
    },
    /** Set a value by default on each datepicker by its model */
    _handlerDatepickerFromModel: function () {
        var self = this;

        this.$el.find('.datepicker').each(function () {
            var element = $(this),
                rvValue = element.attr('rv-value');

            if (rvValue) {
                var value = Uit.getDate(self._getValueFromModelOfRivetsValue(rvValue));
                if (_.isEmpty(value)) {
                    if (!_.isUndefined(element.data('default-today')) || !_.isUndefined(element.attr('default-today'))) {
                        element.datepicker('setDate', moment().format('YYYY-MM-DD'));
                    } else {
                        element.datepicker('update', moment().format('YYYY-MM-DD'));
                        element.datepicker('update', '');
                    }
                } else {
                    element.datepicker('setDate', value);
                }
            } else {
                if (!_.isUndefined(element.data('default-today')) || !_.isUndefined(element.attr('default-today'))) {
                    element.datepicker('setDate', moment().format('YYYY-MM-DD'));
                }
            }
        });
    }
};

_.extend(Uit.ViewComponents, Uit.ViewComponents.Datepicker, Uit.ViewComponents.Timepicker);

// Helper View
Uit.View = Backbone.View.extend({
    initialize: function (options) {

        if (window.rivets) {
            _.extend(this, Uit.ViewComponents);
        }
        this.options = options || {};

        if (!_.isUndefined(this.options.model)) {
            this.model = this.options.model;
            this.listenTo(this.options.model, 'error', this.handlerErrors);
        }

        var self = this;
        _.bindAll(this, 'render');

        this.afterRender = this.afterRender || function () {
            };

        this.render = _.wrap(this.render, function (render) {
            if (self.options.slowMotionRender) {
                render(true);
            } else {
                render();
            }

            this.applyPermissions();
            if (window.rivets) {
                this.rivets = window.rivets.bind(this.el, this);
            }
            this._afterRender();
            self.afterRender();
            return self;
        });

        $(this.el).data('view', this);
    },
    emptyElement: function (element) {
        var classList = $(element + ' > [class]');
        _.each(classList, function (index) {
            var dataView = $('.' + index.className).data('view');
            if (!_.isUndefined(dataView)) {
                Uit.cleanView(dataView);
            }
        });
    },
    _afterRender: function () {
        var el = this.$el;

        if (el.find('.datepicker').length > 0 && this.handlerDatePicker) {
            this.handlerDatePicker();
        }

        if (el.find('.timepicker').length > 0 && this.handlerTimePicker) {
            el.find('.timepicker').timepicker({showInputs: false, disableFocus: true, disableMousewheel: true});
            this.handlerTimePicker();
        }

        if (el.find('.control-tooltip').length > 0 && this.handlerTooltip) {
            this.handlerTooltip();
        }

        if (Uit.addMask) {
            var phoneMask = el.find('.phone-mask');
            _.each(phoneMask, function (elem) {
                elem = $(elem);
                Uit.addMask('[name="' + elem.attr('name') + '"]', '(999) 999-9999');
            });

            var dateMask = el.find('.datepicker');
            _.each(dateMask, function (elem) {
                elem = $(elem);
                Uit.addMask('[name="' + elem.attr('name') + '"]', '9999-99-99');
            });
        }

    },
    handlerErrors: function (model, request) {
        var self = this;
        var response = request.responseJSON;
        if (!_.isUndefined(response)) {
            this.clearErrors();
            _.each(response, function (message, key) {
                if (typeof message !== 'boolean' && key !== 'recatcha' && key !== 'error_code') {
                    self.showError(key, message);
                }
            });
        }
    },
    render: function (slideDown) {
        var template = $(this.template());

        if (Uit.getStateSelect) {
            var stateHelper = template.find('.state-helper');
            _.each(stateHelper, function (elem) {
                elem = $(elem);
                elem.append(Uit.getStateSelect());
            });
        }
        if (slideDown) {
            this.$el.html(template).hide().slideDown(666);
        } else {
            this.$el.html(template);
        }

        return this;
    },
    applyPermissions: function () {
        var template = this.$el;
        var dataPermissions = template.find('[data-permission]');
        _.each(dataPermissions, function (elem) {
            elem = $(elem);
            var id = elem.attr('data-permission');
            if (!App.loginModel.hasAccess(id)) {
                elem.remove();
            } else if (!App.loginModel.canEdit(id)) {
                elem.find('input,select,textarea,button,a:not([role="tab"])').prop('disabled', true);
                elem.find('input,select,textarea').css('background-image', 'none');
                elem.find('.btn,button,a:not([role="tab"])').css('opacity', 0.5).off();
                elem.find('.icon-typeahead-down').remove();
            }
        });
        if (!_.isUndefined(template.data('permission'))) {
            if (!App.loginModel.hasAccess(template.data('permission'))) {
                template = $('<div>Not Authorized to view this file</div>');
                this.$el.html(template);
            }
        }
    },
    serialize: function (form) {
        var el = this.$el;
        var o = {};
        var elem = _.isUndefined(form) ? el.find('input').serializeArray() : form.serializeArray();

        $.each(elem, function () {
            var keyName = this.name;

            if (o[keyName]) {
                if (!o[keyName].push) {
                    o[keyName] = [o[keyName]];
                }
                o[keyName].push(this.value || '');
            } else {
                o[keyName] = this.value || '';
            }
        });
        return o;
    },
    showError: function (key, message) {
        var el = this.$el,
            input = el.find('[name=' + key + ']'),
            baseHTML;

        if (input.length > 0) {
            input.addClass('error');
            baseHTML = '<label class="error" for="' + key + '">' + message + '</label>';
            if (input.parents('.input-group').length) {
                input.parents('.input-group').after($(baseHTML));
            }
            else {
                input.closest('div').append($(baseHTML));
            }
        } else {
            baseHTML = '<div class="error">' + message + '</div>';
            this.$el.find('form').append(baseHTML);
        }
    },
    clearErrors: function () {
        var el = this.$el;
        el.find('label.error,div.error').remove();
        el.find('input.error').removeClass('error');
        if (el.find('.message-captcha').length > 0) {
            el.find('.message-captcha').empty();
        }
    },
    showLoader: function (selector) {
        var loaderHTML = '<div class="loader"><i class="fa fa-spinner fa-pulse fa-4x"></i></div>';
        if (_.isUndefined(selector) || _.isEmpty(selector)) {
            if (!_.isUndefined(this.$el)) {
                this.$el.append(loaderHTML);
            }
        } else {
            if (!_.isUndefined(this.$el)) {
                this.$el.find(selector).append(loaderHTML);
            }
        }
    },
    removeLoader: function (selector) {
        selector = _.isUndefined(selector) || _.isEmpty(selector) ? '.loader' : selector + ' .loader';
        if (!_.isUndefined(this.$el)) {
            this.$el.find(selector).remove();
        }
    }
});


Uit.getDate = function (value, format) {
    format = format || 'YYYY-MM-DD';
    var s = window.s;
    if (s.isBlank(value) || s.isBlank(value) === false && moment(value, 'YYYY-MM-DD').isValid() === false) {
        return '';
    } else {
        return moment(value, 'YYYY-MM-DD').format('YYYY-MM-DD');
    }
};

//Helper Model
Uit.Model = Backbone.Model.extend();

//Helper Collection
Uit.Collection = Backbone.Collection.extend({
    initialize: function () {

    },
    sortBy: 'id',
    sortOrder: 'asc',
    comparator: function (a, b) {
        if (_.isEmpty(this.sortBy) || _.isEmpty(this.sortOrder)) {
            return;
        }
        var sortBy = this.sortBy.split(':');
        var attr = sortBy[0];
        var func = sortBy[1];
        if (_.isUndefined(func)) {
            a = a.get(attr);
            b = b.get(attr);
        } else {
            a = a[func]();
            b = b[func]();
        }

        if (_.isNull(a)) {
            a = '';
        }
        if (_.isNull(b)) {
            b = '';
        }

        if (!_.isUndefined(a) && a !== '' && !_.isNumber(a)) {
            a = a.toString().toLowerCase();
        }
        if (!_.isUndefined(b) && b !== '' && !_.isNumber(b)) {
            b = b.toString().toLowerCase();
        }

        if (this.sortOrder === 'asc') {
            return a > b ? 1 : a < b ? -1 : 0;
        } else {
            return a > b ? -1 : a < b ? 1 : 0;
        }
    }
});

//Helper Router
Uit.Router = Backbone.Router.extend();

//Helper functions
Uit.htmlView = function (view, element) {
    element = element || '#main';
    var classList = $(element + ' > [class]');
    _.each(classList, function (index) {
        var dataView = $('.' + index.className).data('view');
        if (!_.isUndefined(dataView)) {
            Uit.cleanView(dataView);
        }
    });
    $(element).html(view.el);
    view.render();
};

Uit.append = function (view, element) {
    element = element || '#main';
    $(element).append(view.el);
    view.render();
};

Uit.checkViewExist = function (className) {
    var elem = $('.' + className);
    if (elem) {
        var dataView = elem.data('view');
        if (!_.isUndefined(dataView)) {
            return true;
        }
    }
    return false;
};


//remove all child node and events from element
//optional el to reduce scope of the DOM.
Uit.cleanElement = function (stringElem, el) {
    var elem = $(stringElem);
    if (!_.isUndefined(el)) {
        elem = el.find(stringElem);
    }
    elem.empty();
    elem.unbind();
};

Uit.cleanView = function (view) {
    if (!_.isUndefined(view)) {
        view.onClose = view.onClose || function () {
            };

        view.onClose();
        if (view.rivets) {
            view.rivets.unbind();
        }
        view.unbind(); // Unbind all local event bindings

        if (view.model) {
            view.model.unbind('change', view.render, view); // Unbind reference to the model
        }

        if (view.collection) {
            view.collection.unbind('change', view.render, view); // Unbind reference to the model
        }

        view.remove(); // Remove view from DOM

        delete view.$el; // Delete the jQuery wrapped object variable
        delete view.el; // Delete the variable reference to view node
    }
};


Uit.Modal = function (options) {
    var self = this;
    options = options || {};
    options.sizeModal = options.sizeModal || ''; //modal-lg
    options.view = options.view || '';
    options.resize = options.resize || false;

    this.init = function () {
        var $element = $('<div class="modal" tabindex="-1" role="dialog"><div class="modal-dialog"><div class="modal-content"></div></div></div>');

        if (options.sizeModal) {
            $element.find('.modal-dialog').addClass(options.sizeModal);
        }

        $element.on('hidden.bs.modal', function () {
            $element.undelegate();
            if (!_.isUndefined($element.data('view'))) {
                var view = $element.data('view');
                view.onClose = view.onClose || function () {
                    };
                view.onClose();
                view.remove();
                view.unbind();
            }
            $element.remove();
            if ($('.modal.in').length > 0) {
                $('body').addClass('modal-open');
            }
        });


        $element.on('shown.bs.modal', function () {
            if (options.view instanceof Uit.View) {
                options.view.render();
            }

            if (options.resize) {
                $element.resizable({
                    minHeight: $element.height(),
                    minWidth: $element.width()
                });
            }
        });

        if (options.view instanceof Uit.View) {
            $element.data('view', options.view);
            options.view.elementModal = $element;
            $element.find('.modal-content').html(options.view.el);
            $element.modal('show');
        } else {
            $element.find('.modal-content').html(options.view);
            $element.modal('show');
        }
    };
    return {
        show: function () {
            self.init();
        }
    };
};

Uit.CurrencyFormat = function (amount, returnEmptyNull) {
    if (amount) {
        amount = parseFloat(amount);
        return amount.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } else if (returnEmptyNull && (_.isNull(amount) || amount === '')) {
        return '';
    } else {
        return '0.00';
    }
};

// Jquery Mask Helper
Uit.addMask = function (element, format) {
    $(element).mask(format);
};

