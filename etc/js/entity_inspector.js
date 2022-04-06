// Utility to check if type/value is object
function inspector_is_object(type, value) {
  if (type) {
    if (Array.isArray(type)) {
      return false;
    } else {
      return (typeof type) === "object";
    }
  }
  return (typeof value) === "object";
}

function fmt_float(value) {
  let str = value.toString();
  if (str.indexOf('.') == -1 || str.indexOf('e') != -1) {
    /* if number is not a floating point or has e notation, don't change
     * anything */
    return value;
  } else {
    /* if number is floating point, reduce precision to readable amount */
    let num = 4 - str.split('.')[0].length;
    if (num < 0) {
      num = 0;
    }
    return value.toFixed(num);
  }
}

// Formatting functions for units
function fmt_percentage(value) {
  return fmt_float(value *= 100);
}

function fmt_duration(seconds) {
  let result = "";

  let days = Math.floor(seconds / (24 * 60 * 60));
  seconds -= days * (24 * 60 * 60);

  let hours = Math.floor(seconds / (60 * 60));
  seconds -= hours * (60 * 60);

  let minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;
  
  if (days) {
    result += days + "d ";
  }
  if (hours || (result.length && minutes && seconds)) {
    result += hours + "h ";
  }
  if (minutes || (result.length && seconds)) {
    result += minutes + "min ";
  }
  if (seconds) {
    result += fmt_float(seconds) + "s";
  }

  return result;
}

function fmt_date(seconds) {
  let date = new Date(seconds * 1000);
  return date.toDateString();
}

// Key (property name)
const inspector_key_component = Vue.component('inspector-key', {
  props: ['prop_key'],
  template: `<span v-if="prop_key !== undefined" class="inspector-key">{{prop_key}}</span>`
});

// Inspector-value component
const inspector_value_component = Vue.component('inspector-value', {
  props: ["type", "value", "symbol", "separator"],
  functional: true,
  render: function (createElement, context) {
    let unit = (function() {
      if (context.props.type && context.props.type.length > 1) {
        if (inspector_is_object(undefined, context.props.type[1])) {
          return context.props.type[1].unit;
        }
      }
      return undefined;
    })();

    let formatted_value = (function() {
      const type = context.props.type ? context.props.type[0] : undefined;
      let value = context.props.value;

      if (typeof(value) == "object") {
        return JSON.stringify(value); // TODO
      }

      if (!type) {
        return value;
      }

      if (type === "text") {
        if (value) {
          return "\"" + value + "\"";
        } else {
          return "";
        }
      }

      if (unit == "flecs.units.Percentage") {
        value = fmt_percentage(value);
      }
      if (unit == "flecs.units.Duration.Seconds") {
        value = fmt_duration(value);
      }
      if (unit == "flecs.units.Duration.Minutes") {
        value = fmt_duration(value * 60);
      }
      if (unit == "flecs.units.Duration.Minutes") {
        value = fmt_duration(value * 60);
      }
      if (unit == "flecs.units.Duration.Hours") {
        value = fmt_duration(value * 60 * 60);
      }
      if (unit == "flecs.units.Duration.Days") {
        value = fmt_duration(value * 60 * 60 * 24);
      }
      if (unit == "flecs.units.Time.Date") {
        value = fmt_date(value);
      }

      if (typeof(value) == "number") {
        value = fmt_float(value);
      }

      return value;
    })();

    let actual_symbol = (function() {
      if (unit == "flecs.units.Duration.Seconds") {
        return "";
      }
      return context.props.symbol;
    })();

    let css_classes = {
      "inspector-value": true,
    }
    if (context.props.type) {
      css_classes[`inspector-value-${context.props.type[0]}`] = true;
    }

    let content = "";
    if (context.props.separator) {
      content += ",\xa0";
    }
    content += formatted_value.toString().trim();
    if (actual_symbol && actual_symbol.length) {
      content += "\xa0" + actual_symbol;
    }

    return createElement(
      'span', { class: css_classes, }, [content]
    );
  }
});

// Key-value pair (as shown in entity inspector)
const inspector_kv_component = Vue.component('inspector-kv', {
  props: ['prop_key', 'type', 'value', 'list', 'first'],
  computed: {
    is_object: function() {
      return inspector_is_object(this.type, this.value);
    },
    value_css: function() {
      return "inspector-kv-value";
    },
    symbol: function() {
      if (this.type && this.type.length > 1) {
        if (inspector_is_object(undefined, this.type[1])) {
          return this.type[1].symbol;
        }
      }
      return "";
    }
  },
  template: `
    <div class="inspector-kv">
      <template v-if="!list">
        <template v-if="is_object">
          <div class="inspector-prop-object">
            <detail-toggle summary_toggle="true">
              <template v-slot:summary>
                <span>{{prop_key}}</span>
              </template>
              <template v-slot:detail>
                <inspector-props :type="type" :value="value"></inspector-props>
              </template>
            </detail-toggle>
          </div>
        </template>
        <template v-else>
          <inspector-key :prop_key="prop_key"/>
          <inspector-value :css="value_css" :type="type" :value="value" :symbol="symbol"/>
        </template>
      </template>
      <template v-else>
        <inspector-value :type="type" :value="value" :separator="!first" />
      </template>
    </div>
    `
});

// Component properties
const inspector_props_component = Vue.component('inspector-props', {
  props: ['value', 'type', 'list'],
  methods: {
    prop_type: function(prop_name) {
      if (this.type) {
        return this.type[prop_name];
      } else {
        return undefined;
      }
    }
  },
  computed: {
    is_object: function() {
      return inspector_is_object(this.type, this.value);
    },
    is_array: function() {
      return Array.isArray(this.value);
    },
    has_objects: function() {
      for (let k in this.value) {
        const v = this.value[k];
        if ((typeof v) === "object") {
          return true;
        }
      }
      return false;
    },
    css: function() {
      let result = "inspector-props";
      if (this.list) {
        result += "-list"
      } else {
        if (this.has_objects) {
          result += " inspector-props-vertical";
        }
      }
      return result;
    }
  },
  template: `
    <div :class="css">
      <template v-if="is_object">
        <template v-if="is_array">
          <div class="inspector-prop" v-for="(v, k, i) in value"><template v-if="i && list">,&nbsp</template><inspector-kv :type="prop_type(k)" ":value="v" :list="list"/></div>
        </template>
        <template v-else>
          <div class="inspector-prop" v-for="(v, k, i) in value"><inspector-kv :prop_key="k" :type="prop_type(k)" :value="v" :list="list" :first="i == 0"/></div>
        </template>
      </template>
      <template v-else>
        <div class="inspector-prop">
          <inspector-kv :type="type" :value="value" :list="list"/>
        </div>
      </template>
    </div>
    `
});

// Component
const inspector_component_component = Vue.component('inspector-component', {
  props: ['entity', 'index'],
  methods: {
    search_component() {
      if (this.obj) {
        this.$emit('select-query', '(' + this.pred + ", " + this.obj + ')');
      } else {
        this.$emit('select-query', this.pred);
      }
    }
  },
  computed: {
    id: function() {
      return this.entity.ids[this.index];
    },
    id_label: function() {
      if (this.entity.id_labels) {
        return this.entity.id_labels[this.index];
      } else {
        if (this.obj) {
          return [name_from_path(this.pred), name_from_path(this.obj)];
        } else {
          return [name_from_path(this.pred)];
        }
      }
    },
    pred: function() {
      return this.id[0];
    },
    obj: function() {
      if (this.id.length > 1) {
        return this.id[1];
      } else {
        return undefined;
      }
    },
    pred_label: function() {
      return this.id_label[0];
    },
    obj_label: function() {
      return this.id_label[1];
    },
    value: function() {
      if (this.entity.values) {
        let result = this.entity.values[this.index];
        if (result !== 0) {
          return result;
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    },
    type_info: function() {
      if (this.entity.type_info) {
        return this.entity.type_info[this.index];
      } else {
        return 0;
      }
    },
    hidden: function() {
      if (this.entity.hidden) {
        return this.entity.hidden[this.index];
      } else {
        return false;
      }
    },
    name_css: function() {
      if (this.hidden) {
        return "inspector-component-name inspector-component-overridden";
      } else {
        return "inspector-component-name";
      }
    }
  },
  template: `
    <div class="inspector-component">
      <div class="inspector-component-name">
        <detail-toggle :disable="value == undefined" summary_toggle="true">
          <template v-slot:summary>
            <div :class="name_css">
              <entity-reference :entity="pred" :label="pred_label" :disabled="true" show_name="true" v-on="$listeners"/><template v-if="obj">:&nbsp;<span class="inspector-component-object"><entity-reference 
                :entity="obj" 
                :label="obj_label"
                show_name="true" 
                click_name="true"
                v-on="$listeners"/></span></template>
              <icon-button icon="codicons:search" :size="16" v-on:click.stop="search_component"/>
            </div>
          </template>
          <template v-slot:detail>
            <inspector-props v-if="value !== undefined" 
              :type="type_info" 
              :value="value"/>
          </template>
        </detail-toggle>
      </div>
    </div>
    `
});

// Components of entity and/or base entities
const inspector_components_component = Vue.component('inspector-components', {
  props: ['entity', 'show_header', 'is_base'],
  computed: {
    entity_type: function() {
      if (this.entity) {
        return this.entity.ids;
      }
      return [];
    },
    css: function() {
      let result = "inspector-components";
      if (this.show_header) {
        result += " inspector-components-with-header";
      }
      return result;
    },
    detail_css: function() {
      let result = "";

      if (this.show_header) {
        result += " inspector-components-nested";
      }

      return result;
    }
  },
  template: `
    <div :class="css">
      <detail-toggle :disable="!show_header" hide_disabled="true" show_divider="true" summary_toggle="true">
        <template v-slot:summary>
          <span class="inspector-header" v-if="show_header">
            <entity-reference 
              :text="is_base ? 'inherited from' : ''" 
              :entity="entity.path" 
              show_name="true" 
              :disabled="true" 
              icon_link="true" 
              v-on="$listeners"/>
          </span>
        </template>
        <template v-slot:detail>
          <div :class="detail_css">
            <div class="inspector-components-content">
              <inspector-component v-for="(elem, k) in entity_type" :entity="entity" :index="k" :key="k" v-on="$listeners"/>
            </div>
          </div>
        </template>
      </detail-toggle>
    </div>
    `
});

// Top level inspector
const inspector_component = Vue.component('inspector', {
  props: ['entity', 'entity_name', 'valid'],
  methods: {
    expand: function() {
      this.$refs.container.expand();
    },
    select_query: function() {
      this.$emit('select-query', this.entity_name);
    },
    evt_close: function() {
      this.$emit('select-entity');
    },
    name_from_path: function(path) {
      return name_from_path(path);
    },
  },
  computed: {
    parent: function() {
      return parent_from_path(this.entity.path);
    },
    has_parent: function() {
      return this.parent.length != 0;
    },
    brief: function() {
      if (!this.entity) {
        return undefined;
      }

      return this.entity.brief;
    },
    link: function() {
      if (!this.entity) {
        return undefined;
      }

      return this.entity.link;
    },
    has_doc: function() {
      return this.brief || this.link;
    },
    content_css: function() {
      if (!this.valid) {
        return "inspector invalid";
      } else {
        return "inspector";
      }
    }
  },
  template: `
    <content-container 
      ref="container" 
      :disable="!entity_name" 
      no_padding="true"
      closable="true" 
      v-on:close="evt_close">
      
      <template v-slot:summary>
        <template v-if="entity && entity.label">
          {{entity.label}}
        </template>
        <template v-else-if="entity && entity.path">
          {{name_from_path(entity.path)}}
        </template>
        <template v-else-if="entity_name">
          {{name_from_path(entity_name)}}
        </template>
        <template v-else>
          Entity inspector
        </template>


        <span class="content-container-icon-close">
          <icon-button 
            icon="feather:x"
            :size="20"
            v-show="entity_name"
            v-on:click.stop="evt_close"
            v-tooltip="'Clear'" 
          />
        </span>
      </template>
      <template v-slot:detail v-if="entity">
        <div :class="content_css">
          <div class="inspector-doc" v-if="has_doc">
            <span class="inspector-brief" v-if="brief">
              {{brief}}
            </span>
            <span class="inspector-link" v-if="link">
              <a :href="link" target="_blank">[link]</a>
            </span>
          </div>
          <div class="inspector-entity-name" v-if="entity.label != name_from_path(entity.path)">
            <span class="inspector-entity-name-label">Name</span>:&nbsp;<span class="inspector-entity-name">{{name_from_path(entity.path)}}</span>
          </div>
          <div class="inspector-entity-name" v-if="has_parent">
            <span class="inspector-entity-name-label">Parent</span>:&nbsp;<span class="inspector-entity-name"><entity-reference :entity="parent" v-on="$listeners"/></span>
          </div>

          <div class="inspector-content">
            <template v-for="(v, k) in entity.is_a">
              <inspector-components :entity="v" :show_header="true" is_base="true" v-on="$listeners"/>
            </template>

            <inspector-components 
              :entity="entity" 
              :show_header="entity.is_a" 
              v-on="$listeners"/>
          </div>
        </div>
      </template>
    </content-container>
    `
});
