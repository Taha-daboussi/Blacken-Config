import { View, div } from "gpui-kit";
import { openOverlay, closeOverlay, props, checking } from "herdr";
export default class T extends View {
  init(_p, cx) {
    if (checking()) return;
    closeOverlay(props().overlay);
    openOverlay({ mod: "linear", kind: "popup", at: { x: 1200, y: 220 }, width: 260, height: 480, props: { ws: "dawn", issue: {"id":"2e5f4ddb-e8ba-4407-9c83-ea78c81733c6","identifier":"DAW-17","title":"Tracker alert: show the trader's PnL","url":"https://linear.app/dawn-trade/issue/DAW-17/tracker-alert-show-the-traders-pnl","priority":0,"state":{"id":"cb215460-8d41-4845-9aee-73671bf532b8","name":"In Progress","type":"started","position":2,"color":"#f2c94c"},"team":{"id":"462c5f90-bcc1-4c4c-84d6-1bf7253f18c7"}}, states: [{"id":"efb6a6d5-379a-43f1-9b3e-d9fd0b7dbe81","name":"Done","type":"completed","position":3,"color":"#5e6ad2"},{"id":"cb215460-8d41-4845-9aee-73671bf532b8","name":"In Progress","type":"started","position":2,"color":"#f2c94c"},{"id":"a3ea6637-db6e-4c1b-8f65-2f5691900678","name":"Duplicate","type":"duplicate","position":5,"color":"#95a2b3"},{"id":"94faba7f-a199-4d02-ba17-6ebd5d660100","name":"Todo","type":"unstarted","position":1,"color":"#e2e2e2"},{"id":"4af8547b-bc17-4eda-9676-ef25e76401b9","name":"Backlog","type":"backlog","position":0,"color":"#bec2c8"},{"id":"39775fad-430f-4eb1-a4e8-1f88bd451556","name":"Canceled","type":"canceled","position":4,"color":"#95a2b3"}] } });
  }
  render() { return div(); }
}
