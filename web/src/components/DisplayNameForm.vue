<template>
    <div class="display-name-form">
        <div class="input-field">
            <label for="display-name-input">Display Name</label>
            <div class="actions">
                <input
                    type="text"
                    v-model="displayNameValue"
                    id="display-name-input"
                    placeholder="Enter your name"
                />
                <button class="btn secondary" @click="save">Save</button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Auth from "@web/store/modules/auth/AuthModule";
import Vue from "vue";
import Component from "vue-class-component";
import { Getter } from "vuex-class";
import { Watch } from "vue-property-decorator";
import Logger from "@shared/Logger";

const logger = new Logger("DisplayNameForm");

@Component
export default class DisplayNameForm extends Vue {
    @Getter(Auth.Getters.displayName) displayName: string | undefined | null;
    displayNameValue = "";

    beforeMount() {
        this.displayNameValue = this.displayName ?? "";
    }

    @Watch("displayName")
    onDisplayNameChanged(name: string) {
        logger.info("Display Name changed to " + name);
        this.displayNameValue = name;
    }

    save() {
        this.$store.dispatch(Auth.Actions.setDisplayName, {
            displayName: this.displayNameValue
        });
    }
}
</script>

<style lang="scss" scoped>
@import "common";
@import "mixins";
@import "variables";

.display-name-form {
    .actions {
        input {
            margin-right: spacing($md);
            width: 20rem;
        }
        display: flex;
        /*justify-content: center;*/
        align-items: center;
    }
}
</style>