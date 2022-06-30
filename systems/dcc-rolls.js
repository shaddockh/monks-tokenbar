import { BaseRolls } from "./base-rolls.js";
import { i18n, log, setting } from "../monks-tokenbar.js";

export class DCCRolls extends BaseRolls {
  constructor() {
    super();

    this._requestoptions = this._requestoptions.filter((t) => t.id != "dice");
    let dice = {};
    this.config.DICE_CHAIN.forEach((t) => (dice["1d" + t] = "1d" + t));
    this._requestoptions = [
      {
        id: "dice",
        text: "Dice",
        cssclass: "dice-group",
        groups: dice
      }
      /*
            {
                id: "ability", text: i18n("MonksTokenBar.Ability"), groups: {
                    int: this.config.abilities.int,
                    str: this.config.abilities.str,
                    per: this.config.abilities.per,
                    agl: this.config.abilities.agl,
                    lck: this.config.abilities.lck,
                    sta: this.config.abilities.sta
                }
            },
            {
                id: "save", text: i18n("MonksTokenBar.SavingThrow"), groups: {
                    frt: this.config.saves.frt,
                    ref: this.config.saves.ref,
                    wil: this.config.saves.wil
                }
            }
            */
    ].concat(this._requestoptions);
  }

  get _supportedSystem() {
    return true;
  }

  getXP(actor) {
    return actor.data.data.details.xp.value;
  }

  get defaultStats() {
    return [
      { stat: "abilities.lck.value", icon: "fa-clover" },
      { stat: "attributes.ac.value", icon: "fa-shield-alt" }
    ];
  }

  /* TODO */
  defaultRequest(app) {
    let allPlayers =
      app.entries.filter((t) => t.actor?.hasPlayerOwner).length ==
      app.entries.length;
    return allPlayers ? "scores:str" : null;
  }

  /* TODO */
  defaultContested() {
    return "scores:str";
  }

  roll(
    { id, actor, request, rollMode, requesttype, fastForward = false },
    callback,
    e
  ) {
    let rollfn = null;
    let opts = request;
    if (requesttype == "ability") {
      rollfn = function (event, attributeName) {
        const attribute = actor.data.data.abilities[attributeName];
        if (!attribute) return;

        return actor.rollAbilityCheck(attributeName);
      };
    } else if (requesttype == "save") {
      rollfn = function (event, saveName) {
        let options = {};
        const attribute = actor.data.data.saves[saveName];
        debugger;
        if (!attribute) return;
        return actor.rollSavingThrow(attributeName);
      };
    }

    if (rollfn != undefined) {
      try {
        if (requesttype != "skill")
          return rollfn
            .call(actor, e, opts)
            .then((roll) => {
              return callback(roll);
            })
            .catch(() => {
              return {
                id: id,
                error: true,
                msg: i18n("MonksTokenBar.UnknownError")
              };
            });
        else {
          opts.push("ignore");
          return new Promise(function (resolve, reject) {
            rollfn.call(actor, {
              event: e,
              options: opts,
              callback: function (roll) {
                resolve(callback(roll));
              }
            });
          }).catch(() => {
            return {
              id: id,
              error: true,
              msg: i18n("MonksTokenBar.UnknownError")
            };
          });
        }
      } catch (err) {
        console.error(err);
        return { id: id, error: true, msg: i18n("MonksTokenBar.UnknownError") };
      }
    } else
      return {
        id: id,
        error: true,
        msg: actor.name + i18n("MonksTokenBar.ActorNoRollFunction")
      };
  }

  async assignXP(msgactor) {
    let actor = game.actors.get(msgactor.id);
    await actor.update({
      "data.details.xp.value":
        parseInt(actor.data.data.details.xp.value) + parseInt(msgactor.xp)
    });

    if (
      setting("send-levelup-whisper") &&
      actor.data.data.details.xp.value >= actor.data.data.details.xp.next
    ) {
      ChatMessage.create({
        user: game.user.id,
        content: i18n("MonksTokenBar.Levelup"),
        whisper: ChatMessage.getWhisperRecipients(actor.data.name)
      }).then(() => {});
    }
  }
}
