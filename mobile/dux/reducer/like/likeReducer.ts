import { LIKE, UNLIKE } from "@/dux/actionTypes";
import { likeInitialState } from "@/dux/initialState";
import { LikeState } from "@/model/likeState";
import { LikeUnlikeActionType } from "@/model/likeUnlikeActionType";
import { AnyAction } from "redux";

const LikeReducer = (
  state: LikeState = likeInitialState,
  action: AnyAction
): LikeState => {
  switch (action.type) {
    case LIKE:
      return {
        ...state,
        [action.payload]: true,
      };

    case UNLIKE:
      const newState = { ...state };
      delete newState[action.payload];
      return newState;

    default:
      return state;
  }
};

export default LikeReducer;
