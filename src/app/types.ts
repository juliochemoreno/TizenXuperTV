import { Dispatch, SetStateAction } from 'react';
import { VodItem } from '../types/vod';

export type Setter<T> = Dispatch<SetStateAction<T>>;

export type FocusDomain = 'header' | 'content';

/** Fullscreen live drawer areas: search icon, search keyboard, categories, channels */
export type DrawerArea = 'cats' | 'channels' | 'search' | 'searchbtn';

export interface VodPlayerState {
  item: VodItem;
  episode?: any;
  isTrailer?: boolean;
}

export interface LiveLocation {
  catIndex: number;
  channelIndex: number;
}
