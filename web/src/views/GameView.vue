<template>
    <fish-loader class="loading" v-if="loading" />
    <div v-else>
        <div class="container">
            <game-sidebar :players="players" :game="game" />
            <div class="main">
                <div class="my-info" v-if="myPlayer">
                    <span class="title">My Player</span>
                    <div class="details">
                        <display-name-form :show-label="false" class="display-name-form name" :show-team-name="true" />
                    </div>
                </div>
                <div class="gameboard" v-if="game">
                    <fish-loader v-if="loadingNextPhase" message="Loading Next Round" />
                    <game-submit-words v-if="game.phase === 0 && !loadingNextPhase" />
                    <game-phase :phase="game.phase" v-if="game.phase === 0 && !loadingNextPhase" />
                    <div class="timer" v-if="game.phase === 1">
                        <scoreboard :game="game" />
                        <div class="timer centered" v-if="game.turnStartsAt && game.turnEndsAt && game.isPlaying">
                            <countdown
                                :turn-end-time="game.turnEndsAt"
                                :turn-start-time="game.turnStartsAt"
                                @started="activateTurn"
                                @ended="endTurn"
                            />
                        </div>

                        <template v-if="isGameActive">
                            <div
                                v-if="activePlayer && !currentWord"
                                class="current-player centered"
                                :class="{ active: activePlayer.team === myPlayer.team }"
                            >
                                <span class="now-playing-label">Now Playing:</span>
                                <span class="player-name">
                                    {{ activePlayer.displayName }}
                                </span>
                                <span class="team-name">Team {{ currentTeam + 1 }}</span>
                            </div>

                            <div class="secret-word" v-if="currentWord && currentWord.word">
                                <p class="label">Your word is:</p>
                                <h2 class="word marker">{{ currentWord.word }}</h2>
                                <button class="btn primary" @click="completeWord" :disabled="isSaving">
                                    Complete
                                </button>
                            </div>
                        </template>
                        <div
                            class="centered intermission"
                            :class="{ showRoundInfo: showFirstRoundInfo, active: activePlayer.team === myPlayer.team }"
                            v-else-if="!isRoundOver"
                        >
                            <div class="up-next">
                                <template v-if="!isCurrentPlayer">
                                    <div class="intro" v-if="activePlayer">
                                        {{
                                            activePlayer.team === myPlayer.team
                                                ? "Your team is up next:"
                                                : `Team ${activePlayer.team + 1} is up next:`
                                        }}
                                    </div>
                                    <h3 class="player-name" v-if="activePlayer">
                                        {{ activePlayer.displayName }}
                                    </h3>
                                </template>

                                <h3 class="player-name" v-if="isCurrentPlayer">
                                    {{ game.isPlaying ? "Get Ready..." : "You're up next!" }}
                                </h3>
                            </div>
                            <div class="round-info-container" v-if="showFirstRoundInfo">
                                <game-round-info :round="game.round" />
                            </div>

                            <button @click="startTurn" class="btn secondary start-game" v-if="isCurrentPlayer && !game.isPlaying">
                                Start Turn
                            </button>
                        </div>

                        <div class="centered intermission" v-else-if="isRoundOver">
                            <span class="emoji huge">🎣</span>
                            <h4>
                                The Fish Bowl is empty.
                            </h4>
                            <div class="round-info-container">
                                <game-round-info :round="game.round + 1" />
                            </div>
                            <button @click="startTurn" class="btn secondary">
                                Start next round
                            </button>
                            <button @click="restartGame" class="btn danger" v-if="game.round >= 2">
                                Start new game
                            </button>
                        </div>

                        <button class="btn danger" @click="endTurn" v-if="isAdmin">
                            End Turn
                        </button>

                        <!-- Turn Info -->
                        <div v-if="game.currentTurnResult">
                            <p>
                                <strong>{{ playerName(game.currentTurnResult.userId) }}</strong> completed
                                {{ game.currentTurnResult.wordsCompleted.length }} words
                            </p>
                            <ul>
                                <li v-for="(word, index) in game.currentTurnResult.wordsCompleted" :key="`turn_result_${index}`">
                                    {{ word.word }}
                                </li>
                            </ul>
                        </div>

                        <div class="centered round-label round-info" v-if="!isRoundOver">
                            <h4 v-if="game.phase === 1">Round {{ game.round + 1 }} | Turn {{ game.turn + 1 }}</h4>
                            <span>
                                Words Remaining:
                                {{ game.remainingWordsInRound.length }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";
import Logger from "@shared/Logger";
import Games from "@web/store/modules/games/GamesModule";
import Auth from "@web/store/modules/auth/AuthModule";
import { Game, Phase, WordEntry } from "@shared/models/Game";
import { Action, Getter } from "vuex-class";
import Player from "@shared/models/Player";
import DisplayNameForm from "@web/components/DisplayNameForm.vue";
import GameSubmitWords from "@web/components/GameSubmitWords.vue";
import PlayerReadyButton from "@web/components/PlayerReadyButton.vue";
import Scoreboard from "@web/components/Scoreboard.vue";
import GamePhase from "@web/components/GamePhase.vue";
import { CompleteWordPayload } from "@web/store/modules/games/Games";
import { GamesActions } from "@web/store/modules/games/GamesActions";
import FishLoader from "@web/components/FishLoader.vue";
import { Watch } from "vue-property-decorator";
import GameSidebar from "@web/components/GameSidebar.vue";
import Countdown from "@web/components/Countdown.vue";
import GameRoundInfo from "@web/components/GameRoundInfo.vue";
const logger = new Logger("GameView");
@Component({
    components: {
        Countdown,
        GameSubmitWords,
        DisplayNameForm,
        PlayerReadyButton,
        GamePhase,
        Scoreboard,
        FishLoader,
        GameSidebar,
        GameRoundInfo
    }
})
export default class GameView extends Vue {
    @Getter(Games.Getters.currentGame) game?: Game | undefined;
    @Getter(Auth.Getters.currentUserId) userId?: string | undefined;
    @Action(Games.Actions.completeWord) markCompleted!: (payload: CompleteWordPayload) => void;
    @Getter(Games.Getters.currentPlayer) myPlayer: Player | undefined;
    @Action(Games.Actions.startTurn) startTurn!: () => Promise<void>;
    @Action(Games.Actions.reset) restartGame!: () => Promise<void>;
    @Getter(Games.Getters.isGameActive) _gameActive!: boolean;
    @Getter(Games.Getters.isSaving) isSaving!: boolean;
    get isGameActive(): boolean {
        return this._gameActive;
    }

    set isGameActive(isActive: boolean) {
        this.$store.commit(Games.Mutations.setGameActive, {
            isActive: isActive
        });
    }

    get players(): Player[] {
        return Object.values(this.game?.players ?? {});
    }

    get loadingNextPhase(): boolean {
        if (!this.game) {
            return false;
        }
        return this.game.phase === Phase.SETUP && this.game.allPlayersInPhase(Phase.IN_PROGRESS) && this.game.playersList.length > 1;
    }

    get loading(): boolean {
        return !this.game || !this.hasJoined;
    }

    get hasJoined(): boolean {
        if (!this.userId) {
            return false;
        }

        return !!this.game?.players[this.userId];
    }

    get showFirstRoundInfo() {
        return (
            this.game?.round === 0 &&
            !this.isGameActive &&
            !this.game.isPlaying &&
            this.activePlayer &&
            this.game?.phase === Phase.IN_PROGRESS &&
            this.game.words.length === this.game.remainingWordsInRound.length
        );
    }

    @Watch("game")
    onLoadingChanged(game: boolean) {
        document.title = `${this.game?.name ?? "Play"}` + " | Fishbowl";
        if (game && !this.hasJoined) {
            const gameId = this.$route.params.gameId;
            if (gameId) {
                this.$store.dispatch(Games.Actions.join, { gameId });
            }
            logger.info(`Game ID = ${gameId}`);
        }
    }

    beforeMount() {
        const gameId = this.$route.params.gameId;
        if (gameId) {
            logger.info("Setting current game id to ", gameId);
            this.$store.commit(Games.Mutations.setCurrentGame, { gameId });
        } else {
            logger.info("No game id found on route");
        }
    }

    mounted() {
        document.title = `${this.game?.name ?? "Play"}` + " | Fishbowl";
    }

    activateTurn() {
        this.isGameActive = true;
    }

    deactivateTurn() {
        this.isGameActive = false;
        this.$store.dispatch(GamesActions.turnEnded);
    }

    playerIsReady(player: Player): boolean {
        const gamePhase = this.game?.phase ?? Phase.SETUP;
        return (player.phase ?? Phase.SETUP) > gamePhase;
    }

    get isRoundOver(): boolean {
        return this.game?.remainingWordsInRound.length === 0;
    }

    get isAdmin(): boolean {
        return !!localStorage.getItem("admin");
    }

    get isCurrentPlayer(): boolean {
        return this.activePlayer?.userId === this.userId;
    }

    get currentWord(): WordEntry | undefined {
        if (this.isCurrentPlayer) {
            return this.game?.getCurrentWord();
        }
        return undefined;
    }

    get isCurrentTeam(): boolean {
        return this.currentTeam === this.myPlayer?.team;
    }

    get currentTeam(): number {
        return this.game?.currentTeam ?? 0;
    }

    get activePlayer(): Player | undefined {
        return this.game?.getActivePlayer();
    }

    get teams(): number[] {
        const teams: number[] = [];
        if (!this.game) {
            return teams;
        }
        for (let team = 0; team < this.game.numberOfTeams; team++) {
            teams.push(team);
        }
        return teams;
    }

    completeWord() {
        const word = this.currentWord;
        if (word) {
            this.markCompleted({ word });
        }
    }

    playerName(userId?: string): string | undefined {
        if (!userId) {
            return undefined;
        }
        return this.game?.getPlayer(userId)?.displayName;
    }

    async endTurn() {
        const game = this.game;
        if (!game) {
            return;
        }
        this.deactivateTurn();
    }
}
</script>

<style scoped lang="scss">
@import "mixins";

.centered {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
}

.container {
    display: flex;
    flex-direction: row;
    @include maxW($br-phone-max) {
        flex-direction: column-reverse;
    }

    .sidebar {
        @include minW($br-phone-max) {
            width: 30rem;
        }
        //@include rounded($cornerRadiusLg);
        @include container($lg);
        background: color($color-background);
    }

    .main {
        flex: 1;
        background-color: color($color-background, $variant-light);
        .gameboard {
            display: flex;
            flex: 1;
            max-width: 600px;
            margin: 0 auto;
            flex-direction: column;
            @include container($lg);
            padding-bottom: 40rem;
            padding-top: spacing($xl);

            .round-info {
                margin-bottom: spacing($xl);
            }

            @include maxW($br-tablet-min) {
                padding-bottom: spacing($lg);
            }

            .phase {
                margin-bottom: spacing($xl);
            }
        }
    }
}

.ready-container {
    padding: spacing($lg) 0 spacing($lg) 0;
    @include maxW($br-tablet-max) {
        text-align: center;
    }
}

.secret-word,
.current-player,
.intermission {
    @include shadowbox;
    @include container($xl);
    @include rounded($cornerRadiusXl);
    margin: spacing($lg) 0 spacing($xxl);
}

.intermission {
    background-color: color($color-background, $variant-dark);

    .start-game {
        margin-top: spacing($lg);
    }

    .emoji {
        font-size: 8rem;
    }

    .round-info-container {
        margin-top: spacing($lg);
    }

    .up-next {
        @include container;
        @include rounded($cornerRadiusLg);
        padding: spacing($lg);
        &.showRoundInfo {
            background-color: rgba(color($color-accent, $variant-base), 0.6);
            color: color($color-text, $variant-light);
            width: 100%;
        }

        .intro {
            margin-bottom: spacing($md);
        }

        .player-name {
        }
    }

    &.active {
        background-color: color($color-accent, $variant-light);
        color: white;
    }
}

.secret-word {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: color($color-accent, $variant-light);
    color: white;

    .label {
        margin: 0;
    }

    .word {
        padding: spacing($lg);
        font-size: 5rem;
        font-weight: normal;
    }
}

.current-player {
    background-color: color($color-primary, $variant-light);
    .now-playing-label {
        @include font($sm);
        margin-bottom: spacing($lg);
    }

    .player-name {
        @include font($lg, $bold);
        //color: color($color-accent);
    }

    .team-name {
        @include font($md);
        //color: color($color-accent, $variant-light);
    }

    &.active {
        background-color: color($color-accent, $variant-light);
        color: white;
    }
}

.my-info {
    @include visible-sm;

    .title {
        @include font($sm);
        margin: 0 spacing($lg);
        display: none;
    }
    background-color: color($color-background, $variant-base);
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: flex-start;

    @include container;

    .details {
        display: flex;
        flex-direction: column;
        flex: 1;
    }
}
</style>
