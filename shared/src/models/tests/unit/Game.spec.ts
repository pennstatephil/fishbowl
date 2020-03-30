import { Game, Phase } from "@shared/models/Game";
import Player from "@shared/models/Player";

function createPlayer(index: number) {
    return new Player(`u${index}`, `Name ${index}`);
}

function setupGame(): Game {
    const game = new Game();
    game.addPlayer(new Player("u1", "One"));
    game.addPlayer(new Player("u2", "Two"));
    game.addPlayer(new Player("u3", "Three"));
    game.addPlayer(new Player("u4", "Four"));

    game.addWord({ userId: "u1", word: "U1 One" });
    game.addWord({ userId: "u1", word: "U1 Two" });

    game.addWord({ userId: "u2", word: "U2 One" });
    game.addWord({ userId: "u2", word: "U2 Two" });
    game.addWord({ userId: "u2", word: "U2 Three" });

    game.addWord({ userId: "u3", word: "U3 One" });
    game.addWord({ userId: "u3", word: "U3 Two" });

    game.addWord({ userId: "u4", word: "U4 One" });
    game.addWord({ userId: "u4", word: "U4 Two" });

    return game;
}

test("Default state of game", () => {
    const game = new Game();
    expect(game.currentTeam).toEqual(0);
    expect(game.numberOfTeams).toEqual(2);
});

test("set up game", () => {
    const game = setupGame();
    expect(game.playersList.length).toEqual(4);
    expect(game.words.length).toEqual(9);
    expect(game.isPlaying).toBeFalsy();
    expect(game.remainingWordsInRound.length).toEqual(0);
    expect(game.currentPlayerByTeam).toEqual({});
});

describe("setup game and take actions on it", () => {
    test("only assign teams when the game is in progress", () => {
        const game = setupGame();

        //dont' assign teams until the game is in progress
        expect(game.playersInTeam(0)).toEqual([]);
        game.assignTeams();

        expect(game.playersInTeam(0)).toEqual([]);
        game.phase = Phase.IN_PROGRESS;
        game.assignTeams();
        expect(game.playersInTeam(0).length).toEqual(2);
        expect(game.playersInTeam(1).length).toEqual(2);
    });

    test("assign teams after new player joins", () => {
        const game = setupGame();
        game.phase = Phase.IN_PROGRESS;
        game.assignTeams();
        expect(game.playersInTeam(0).length).toEqual(2);

        expect(game.playersInTeam(0).some(p => p.userId === "u1"));
        expect(game.playersInTeam(0).some(p => p.userId === "u3"));

        expect(game.playersInTeam(1).length).toEqual(2);
        expect(game.playersInTeam(1).some(p => p.userId === "u2"));
        expect(game.playersInTeam(1).some(p => p.userId === "u4"));

        //add a player and re-assign teams
        game.addPlayer(createPlayer(5));
        game.assignTeams();

        expect(game.playersInTeam(0).length).toEqual(3);

        expect(game.playersInTeam(0).some(p => p.userId === "u1"));
        expect(game.playersInTeam(0).some(p => p.userId === "u3"));
        expect(game.playersInTeam(0).some(p => p.userId === "u5"));

        expect(game.playersInTeam(1).length).toEqual(2);
        expect(game.playersInTeam(1).some(p => p.userId === "u2"));
        expect(game.playersInTeam(1).some(p => p.userId === "u4"));
    });

    test("next phase, players not all ready", () => {
        const game = setupGame();
        expect(game.nextPhase()).toBeFalsy();
        expect(game.phase).toEqual(Phase.SETUP);
    });

    test("next phase, all players ready", () => {
        const game = setupGame();
        game.playersList.forEach(p => [(p.phase = Phase.IN_PROGRESS)]);
        expect(game.nextPhase()).toBeTruthy();
        expect(game.phase).toEqual(Phase.IN_PROGRESS);
    });

    test("next phase from IN PROGRESS", () => {
        const game = setupGame();
        game.playersList.forEach(p => [(p.phase = Phase.IN_PROGRESS)]);

        game.phase = Phase.IN_PROGRESS;
        expect(game.nextPhase()).toBeTruthy();
        expect(game.phase).toEqual(Phase.FINISHED);
    });

    test("next phase from FINISHED", () => {
        const game = setupGame();
        game.playersList.forEach(p => [(p.phase = Phase.IN_PROGRESS)]);

        game.phase = Phase.FINISHED;
        expect(game.nextPhase()).toBeFalsy();
        expect(game.phase).toEqual(Phase.FINISHED);
    });
});
