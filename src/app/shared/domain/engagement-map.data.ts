import { MapFeature } from './models';

export const ENGAGEMENT_MAP_FEATURES: MapFeature[] = [
  {
    recordType: 'location',
    name: 'Northern Vanguard Base',
    side: 'north',
    subtype: 'air_base',
    geometryType: 'point',
    x: 198.3,
    y: 335,
    notes: 'Western coastal military base.'
  },
  {
    recordType: 'location',
    name: 'Highridge Command',
    side: 'north',
    subtype: 'air_base',
    geometryType: 'point',
    x: 838.3,
    y: 75,
    notes: 'Deep inland military base.'
  },
  {
    recordType: 'location',
    name: 'Boreal Watch Post',
    side: 'north',
    subtype: 'air_base',
    geometryType: 'point',
    x: 1158.3,
    y: 385,
    notes: 'Forward operating base.'
  },
  {
    recordType: 'location',
    name: 'Arktholm (Capital X)',
    side: 'north',
    subtype: 'capital',
    geometryType: 'point',
    x: 418.3,
    y: 95,
    notes: 'Political capital of Country X.'
  },
  {
    recordType: 'location',
    name: 'Valbrek',
    side: 'north',
    subtype: 'major_city',
    geometryType: 'point',
    x: 1423.3,
    y: 213.3,
    notes: 'Eastern city near coast.'
  },
  {
    recordType: 'location',
    name: 'Nordvik',
    side: 'north',
    subtype: 'major_city',
    geometryType: 'point',
    x: 140,
    y: 323.3,
    notes: 'Major western coastal city.'
  },
  {
    recordType: 'location',
    name: 'Firewatch Station',
    side: 'south',
    subtype: 'air_base',
    geometryType: 'point',
    x: 1398.3,
    y: 1071.7,
    notes: 'Eastern coastal military base.'
  },
  {
    recordType: 'location',
    name: 'Southern Redoubt',
    side: 'south',
    subtype: 'air_base',
    geometryType: 'point',
    x: 321.7,
    y: 1238.3,
    notes: 'Inland military base.'
  },
  {
    recordType: 'location',
    name: 'Spear Point Base',
    side: 'south',
    subtype: 'air_base',
    geometryType: 'point',
    x: 918.3,
    y: 835,
    notes: 'Forward military strike base.'
  },
  {
    recordType: 'location',
    name: 'Meridia (Capital Y)',
    side: 'south',
    subtype: 'capital',
    geometryType: 'point',
    x: 1225,
    y: 1208.3,
    notes: 'Political capital of Country Y.'
  },
  {
    recordType: 'location',
    name: 'Callhaven',
    side: 'south',
    subtype: 'major_city',
    geometryType: 'point',
    x: 96.7,
    y: 1150,
    notes: 'Major western city.'
  },
  {
    recordType: 'location',
    name: 'Solano',
    side: 'south',
    subtype: 'major_city',
    geometryType: 'point',
    x: 576.7,
    y: 1236.7,
    notes: 'Inland major city.'
  },
  {
    recordType: 'terrain',
    id: 'north_mainland',
    name: 'Northern Mainland',
    side: 'north',
    subtype: 'mainland',
    geometryType: 'polygon',
    coordinates: [[0.0, 0.0], [1666.7, 0.0], [1666.7, 283.3], [1533.3, 313.3], [1433.3, 290.0], [1333.3, 283.3], [1236.7, 341.7], [1130.0, 316.7], [1026.7, 296.7], [926.7, 353.3], [813.3, 323.3], [713.3, 313.3], [610.0, 366.7], [503.3, 320.0], [393.3, 333.3], [296.7, 383.3], [196.7, 340.0], [90.0, 353.3], [0.0, 380.0]]
  },
  {
    recordType: 'terrain',
    id: 'south_mainland',
    name: 'Southern Mainland',
    side: 'south',
    subtype: 'mainland',
    geometryType: 'polygon',
    coordinates: [[0.0, 1300.0], [1666.7, 1300.0], [1666.7, 1066.7], [1580.0, 1026.7], [1470.0, 1046.7], [1363.3, 1070.0], [1260.0, 1013.3], [1146.7, 1036.7], [1040.0, 1066.7], [933.3, 1010.0], [820.0, 1043.3], [713.3, 1076.7], [603.3, 1020.0], [490.0, 1036.7], [386.7, 1080.0], [280.0, 1030.0], [163.3, 1050.0], [50.0, 1080.0], [0.0, 1063.3]]
  },
  {
    recordType: 'terrain',
    id: 'north_island_west',
    name: 'North Strait Island West',
    side: 'north',
    subtype: 'island',
    geometryType: 'polygon',
    coordinates: [[591.7, 446.7], [630.0, 426.7], [683.3, 430.0], [706.7, 463.3], [726.7, 493.3], [710.0, 536.7], [676.7, 546.7], [643.3, 556.7], [603.3, 530.0], [590.0, 496.7]]
  },
  {
    recordType: 'terrain',
    id: 'north_island_east',
    name: 'North Strait Island East',
    side: 'north',
    subtype: 'island',
    geometryType: 'polygon',
    coordinates: [[1130.0, 356.7], [1153.3, 340.0], [1183.3, 346.7], [1193.3, 373.3], [1203.3, 396.7], [1186.7, 423.3], [1160.0, 426.7], [1133.3, 430.0], [1113.3, 406.7], [1113.3, 380.0]]
  },
  {
    recordType: 'terrain',
    id: 'north_remote_island',
    name: 'North Remote Island',
    side: 'north',
    subtype: 'island',
    geometryType: 'polygon',
    coordinates: [[246.7, 591.7], [266.7, 570.0], [300.0, 563.3], [326.7, 576.7], [353.3, 590.0], [366.7, 620.0], [360.0, 650.0], [330.0, 693.3], [303.3, 690.0], [276.7, 686.7], [253.3, 663.3], [246.7, 633.3]]
  },
  {
    recordType: 'terrain',
    id: 'south_forward_island',
    name: 'South Forward Island',
    side: 'south',
    subtype: 'island',
    geometryType: 'polygon',
    coordinates: [[1363.3, 713.3], [1403.3, 693.3], [1450.0, 703.3], [1460.0, 736.7], [1470.0, 766.7], [1443.3, 800.0], [1410.0, 800.0], [1376.7, 800.0], [1350.0, 773.3], [1353.3, 743.3]]
  },
  {
    recordType: 'terrain',
    id: 'south_small_island',
    name: 'South Small Island',
    side: 'south',
    subtype: 'island',
    geometryType: 'polygon',
    coordinates: [[396.7, 890.0], [426.7, 870.0], [460.0, 880.0], [466.7, 910.0], [473.3, 936.7], [450.0, 960.0], [421.7, 960.0], [393.3, 956.7], [373.3, 933.3], [376.7, 906.7]]
  },
  {
    recordType: 'terrain',
    id: 'south_central_peninsula',
    name: 'South Central Peninsula',
    side: 'south',
    subtype: 'peninsula',
    geometryType: 'polygon',
    coordinates: [[883.3, 893.3], [910.0, 866.7], [946.7, 843.3], [943.3, 806.7], [940.0, 773.3], [903.3, 760.0], [876.7, 783.3], [850.0, 806.7], [850.0, 863.3], [883.3, 893.3]]
  }
];
