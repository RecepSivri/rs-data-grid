import { Action } from "@ngrx/store";
import ActionWithPayload from "../../ActionWithPayload";
import ToDo from "todo.model";

export const GET_TODO = '[ToDo] GET_TODO';
export const CREATE_TODO = '[ToDo] CREATE_TODO';

export class GetToDo implements Action {
  readonly type = GET_TODO;

  constructor() { }
}

export class CreateToDo implements ActionWithPayload<ToDo> {
  readonly type = CREATE_TODO;
  payload: ToDo;

  constructor(payload: ToDo) {
    this.payload = payload;
  }
}

export type All = GetToDo | CreateToDo ;
