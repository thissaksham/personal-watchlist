import { 
    SteamIcon, EpicGamesIcon, GOGIcon, XboxIcon, PlayStationIcon, 
    NintendoSwitchIcon, BattleNetIcon, UbisoftIcon, EAIcon, 
    RockstarGamesIcon, AmazonIcon, MicrosoftStoreIcon
} from '../components/PlatformIcons';

export const PLATFORMS_DATA = [
    { id: 'Steam', label: 'Steam', icon: SteamIcon, color: '#66C0F4' }, // Steam Blue - Lighter
    { id: 'Epic', label: 'Epic Games Store', icon: EpicGamesIcon, color: '#FFFFFF' }, // White for Dark Mode
    { id: 'GOG', label: 'GOG', icon: GOGIcon, color: '#BF66FF' }, // Lighter Purple
    { id: 'Xbox', label: 'Xbox', icon: XboxIcon, color: '#107C10' }, // Xbox Green
    { id: 'PlayStation', label: 'PlayStation', icon: PlayStationIcon, color: '#0070D1' }, // PS Blue
    { id: 'Nintendo', label: 'Nintendo Switch', icon: NintendoSwitchIcon, color: '#E60012' }, // Switch Red
    { id: 'Battle.net', label: 'Battle.net', icon: BattleNetIcon, color: '#148EFF' }, // Battle.net Blue
    { id: 'Ubisoft', label: 'Ubisoft Connect', icon: UbisoftIcon, color: '#0091DA' }, // Ubisoft Blue
    { id: 'EA', label: 'EA App', icon: EAIcon, color: '#FF4747' }, // EA Red
    { id: 'MicrosoftStore', label: 'Microsoft Store', icon: MicrosoftStoreIcon, color: '#00A4EF' }, // Microsoft Blue
    { id: 'Rockstar', label: 'Rockstar Games', icon: RockstarGamesIcon, color: '#FCAF17' }, // Rockstar Gold
    { id: 'Amazon', label: 'Amazon Games', icon: AmazonIcon, color: '#FF9900' } // Amazon Orange
];

export const getPlatformById = (id: string) => PLATFORMS_DATA.find(p => p.id === id);
