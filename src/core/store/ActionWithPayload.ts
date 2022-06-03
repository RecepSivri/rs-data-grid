import { Action } from "@ngrx/Store";

export default interface ActionWithPayload<T> extends Action {
  payload: T;
}
