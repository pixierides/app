/* @ds-bundle: {"format":4,"namespace":"PixieRidesDesignSystem_457785","components":[{"name":"LightTrail","sourcePath":"components/brand/LightTrail.jsx"},{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"NameSign","sourcePath":"components/brand/NameSign.jsx"},{"name":"Badge","sourcePath":"components/data/Badge.jsx"},{"name":"Card","sourcePath":"components/data/Card.jsx"},{"name":"ListRow","sourcePath":"components/data/ListRow.jsx"},{"name":"PriceDisplay","sourcePath":"components/data/PriceDisplay.jsx"},{"name":"RouteChip","sourcePath":"components/data/RouteChip.jsx"},{"name":"TripStatus","sourcePath":"components/feedback/TripStatus.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"IncludedRow","sourcePath":"components/forms/IncludedRow.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"TabBar","sourcePath":"components/navigation/TabBar.jsx"}],"sourceHashes":{"components/brand/LightTrail.jsx":"6d43b83c4524","components/brand/Logo.jsx":"a6e4386ca0c7","components/brand/NameSign.jsx":"e3fa4f109fe8","components/data/Badge.jsx":"ce92368e741c","components/data/Card.jsx":"b5b4bb50ebf6","components/data/ListRow.jsx":"f3e5e94714f7","components/data/PriceDisplay.jsx":"9418cb51820b","components/data/RouteChip.jsx":"826d72fc5424","components/feedback/TripStatus.jsx":"2342b853793e","components/forms/Button.jsx":"876f837b66df","components/forms/IncludedRow.jsx":"729158eb1a63","components/forms/Input.jsx":"6ae180479228","components/navigation/TabBar.jsx":"9c095fb4bb8a","ui_kits/mobile-app/AppShell.jsx":"dc33ba4813d7","ui_kits/mobile-app/DriverHereScreen.jsx":"9dcc966aa539","ui_kits/mobile-app/HomeScreen.jsx":"ce713327a81e","ui_kits/mobile-app/QuoteScreen.jsx":"3ed6b03dccf6","ui_kits/mobile-app/TripScreen.jsx":"decf42eeb970"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PixieRidesDesignSystem_457785 = window.PixieRidesDesignSystem_457785 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/LightTrail.jsx
try { (() => {
/* Minimal node glyphs (plane-arrival / signpost / moon). Generic functional
   icons drawn at a single stroke weight to match the brand's line feel. */
const Glyphs = {
  plane: /*#__PURE__*/React.createElement("path", {
    d: "M2 14 L22 9 M14 4 l6 2 -5 4 M6 12 l3 4 -1 3 -4 -5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }),
  sign: /*#__PURE__*/React.createElement("g", {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 3v18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 6h7l2.5 2.5L19 11h-7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 13H5L2.5 15.5 5 18h7"
  })),
  moon: /*#__PURE__*/React.createElement("path", {
    d: "M20 14.5A8 8 0 1 1 10.5 4a6.2 6.2 0 0 0 9.5 10.5Z",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinejoin: "round"
  })
};

/**
 * The light trail — the single most ownable device in the brand.
 * Plane → meet → rest, three beats. A warm dotted path across a navy field
 * with round nodes (navy fill, orange ring, one glyph each). Dust drifts and
 * twinkles along the path; the final node "lands".
 */
function LightTrail({
  height = 170,
  labels = ['You land', "We're holding your name", 'Kids in bed'],
  animate = true,
  style
}) {
  const path = 'M40 120 C 150 120, 190 54, 300 54 S 460 92, 560 44';
  const nodes = [{
    x: 40,
    y: 120,
    g: 'plane'
  }, {
    x: 300,
    y: 54,
    g: 'sign'
  }, {
    x: 560,
    y: 44,
    g: 'moon'
  }];
  const dots = [0, 0.16, 0.33, 0.5, 0.66, 0.82];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--sea)',
      borderRadius: 'var(--radius-card)',
      position: 'relative',
      overflow: 'hidden',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--dot-warm)',
      backgroundSize: '18px 18px',
      opacity: 0.5
    }
  }), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 600 170",
    width: "100%",
    height: height,
    style: {
      position: 'relative',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("path", {
    id: "pr-trail",
    d: path,
    fill: "none",
    stroke: "rgba(249,115,22,.28)",
    strokeWidth: "2",
    strokeDasharray: "1 9",
    strokeLinecap: "round"
  }), animate && dots.map((d, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    r: "3",
    fill: "#F97316"
  }, /*#__PURE__*/React.createElement("animateMotion", {
    dur: "5.2s",
    begin: `${d * 5.2}s`,
    repeatCount: "indefinite",
    keyPoints: "0;1",
    keyTimes: "0;1",
    calcMode: "linear"
  }, /*#__PURE__*/React.createElement("mpath", {
    href: "#pr-trail"
  })), /*#__PURE__*/React.createElement("animate", {
    attributeName: "opacity",
    values: "0;1;1;0",
    dur: "5.2s",
    begin: `${d * 5.2}s`,
    repeatCount: "indefinite"
  }), /*#__PURE__*/React.createElement("animate", {
    attributeName: "r",
    values: "2;3.4;2",
    dur: "1.3s",
    begin: `${d}s`,
    repeatCount: "indefinite"
  }))), nodes.map((n, i) => /*#__PURE__*/React.createElement("g", {
    key: i,
    transform: `translate(${n.x},${n.y})`
  }, /*#__PURE__*/React.createElement("circle", {
    r: "19",
    fill: "var(--sea)"
  }), /*#__PURE__*/React.createElement("circle", {
    r: "19",
    fill: "none",
    stroke: "#F97316",
    strokeWidth: "2.5"
  }), /*#__PURE__*/React.createElement("g", {
    transform: "translate(-12,-12)",
    color: "#F5B27A",
    style: {
      color: '#F6C79E'
    }
  }, Glyphs[n.g])))), labels && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0 12px 16px',
      position: 'relative'
    }
  }, labels.map((l, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      textAlign: i === 0 ? 'left' : i === labels.length - 1 ? 'right' : 'center',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 12.5,
      color: 'var(--foam)'
    }
  }, l))));
}
Object.assign(__ds_scope, { LightTrail });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/LightTrail.jsx", error: String((e && e.message) || e) }); }

// components/brand/Logo.jsx
try { (() => {
/* Official Pixie Rides logo (from uploads/pixie_logo.svg). Swoosh normalized to
   brand orange #F97316 per v1.2 ("logo orange must be brand orange"). */
const TEXT_D = "M1492 535 L1494 537 L1498 549 L1496 551 L1488 551 L1486 549 L1488 541 Z M1166 535 L1169 538 L1171 546 L1173 549 L1171 551 L1162 551 L1160 549 L1164 537 Z M846 535 L849 538 L852 549 L850 551 L842 551 L840 549 L844 537 Z M1300 533 L1302 531 L1313 531 L1316 534 L1317 539 L1313 544 L1303 544 L1300 541 Z M942 531 L952 531 L956 533 L961 540 L960 553 L954 559 L942 560 L940 558 L940 533 Z M750 533 L752 531 L763 531 L767 535 L767 539 L764 543 L752 544 L750 542 Z M1601 530 L1608 530 L1612 532 L1618 540 L1618 550 L1616 554 L1611 559 L1606 561 L1598 559 L1594 555 L1591 546 L1594 536 Z M1399 533 L1404 530 L1412 531 L1415 534 L1415 540 L1410 544 L1401 544 L1399 542 Z M1354 530 L1360 530 L1364 532 L1368 536 L1370 541 L1370 550 L1368 554 L1363 559 L1358 561 L1351 560 L1345 554 L1343 548 L1343 542 L1346 535 L1349 532 Z M1111 533 L1114 530 L1123 531 L1127 534 L1128 538 L1122 544 L1113 544 L1111 542 Z M999 530 L1005 530 L1010 532 L1013 535 L1016 542 L1016 548 L1014 554 L1009 559 L1003 561 L995 559 L991 555 L988 547 L990 537 L996 531 Z M704 530 L714 531 L719 536 L721 541 L721 549 L719 554 L714 559 L708 561 L701 559 L696 554 L694 549 L694 542 L697 535 Z M1641 524 L1640 525 L1640 566 L1641 567 L1646 567 L1647 566 L1647 541 L1649 539 L1668 567 L1674 567 L1676 563 L1676 558 L1675 557 L1676 528 L1674 524 L1669 524 L1668 525 L1668 548 L1666 550 L1650 527 L1647 524 Z M1562 524 L1561 525 L1562 527 L1562 566 L1563 567 L1569 567 L1570 566 L1570 525 L1569 524 Z M1517 524 L1516 525 L1516 530 L1517 531 L1527 531 L1529 533 L1529 566 L1530 567 L1535 567 L1536 566 L1536 533 L1538 531 L1548 530 L1549 525 L1548 524 Z M1488 524 L1486 526 L1471 566 L1472 567 L1478 567 L1481 561 L1484 558 L1500 558 L1505 567 L1511 567 L1512 565 L1501 538 L1497 525 L1496 524 Z M1434 524 L1433 525 L1434 530 L1444 530 L1446 532 L1446 566 L1447 567 L1453 567 L1454 566 L1454 533 L1458 530 L1466 530 L1467 525 L1466 524 Z M1393 524 L1392 525 L1392 535 L1391 536 L1392 538 L1392 566 L1393 567 L1398 567 L1399 566 L1399 553 L1401 551 L1406 551 L1417 567 L1424 567 L1425 566 L1415 551 L1422 544 L1423 541 L1423 532 L1422 530 L1415 524 Z M1316 524 L1294 524 L1293 525 L1293 566 L1294 567 L1300 567 L1301 566 L1300 565 L1300 560 L1301 559 L1300 553 L1302 551 L1315 551 L1319 549 L1324 544 L1325 541 L1324 531 L1321 527 Z M1199 524 L1198 525 L1199 566 L1200 567 L1205 567 L1206 566 L1206 557 L1207 556 L1206 542 L1208 540 L1214 547 L1225 564 L1228 567 L1234 567 L1235 566 L1235 531 L1234 530 L1235 525 L1234 524 L1228 524 L1227 525 L1227 548 L1225 550 L1209 527 L1206 524 Z M1162 524 L1145 566 L1146 567 L1153 567 L1158 558 L1175 558 L1180 567 L1187 567 L1188 566 L1185 561 L1172 526 L1170 524 Z M1104 524 L1103 525 L1103 566 L1104 567 L1110 567 L1111 566 L1111 553 L1113 551 L1117 551 L1129 567 L1136 567 L1137 566 L1127 551 L1133 546 L1135 542 L1136 536 L1135 531 L1133 528 L1127 524 Z M1058 524 L1057 525 L1058 530 L1068 530 L1070 532 L1070 566 L1071 567 L1077 567 L1078 566 L1078 533 L1080 531 L1090 531 L1091 530 L1091 525 L1090 524 Z M933 524 L932 525 L932 566 L933 567 L954 567 L962 563 L967 557 L969 551 L969 539 L966 532 L961 527 L955 524 Z M879 524 L878 525 L878 566 L879 567 L885 567 L886 566 L886 541 L888 539 L908 567 L915 567 L916 566 L916 525 L915 524 L909 524 L908 525 L908 549 L906 551 L897 540 L886 524 Z M842 524 L825 566 L826 567 L833 567 L838 558 L855 558 L860 567 L866 567 L867 566 L866 562 L862 554 L852 526 L850 524 Z M790 524 L789 525 L789 566 L790 567 L816 567 L817 566 L817 561 L816 560 L799 560 L797 558 L797 525 L796 524 Z M744 524 L743 525 L743 566 L744 567 L749 567 L750 566 L750 553 L752 551 L757 551 L768 567 L775 567 L776 566 L766 551 L772 546 L775 540 L775 534 L773 529 L766 524 Z M1600 523 L1590 528 L1586 533 L1583 541 L1583 550 L1585 556 L1593 565 L1601 568 L1609 568 L1618 564 L1624 557 L1626 552 L1626 539 L1623 532 L1617 526 L1610 523 Z M1351 523 L1343 527 L1337 534 L1335 539 L1335 551 L1339 560 L1343 564 L1352 568 L1360 568 L1370 564 L1376 557 L1378 552 L1378 538 L1375 532 L1369 526 L1362 523 Z M1259 523 L1253 526 L1249 531 L1249 539 L1255 546 L1269 551 L1272 554 L1272 557 L1269 560 L1262 561 L1257 559 L1252 555 L1247 559 L1247 561 L1256 567 L1268 568 L1275 565 L1278 562 L1280 557 L1279 549 L1272 543 L1259 539 L1256 535 L1261 530 L1266 530 L1274 534 L1278 529 L1275 526 L1268 523 Z M993 524 L985 530 L981 537 L980 550 L982 556 L990 565 L998 568 L1010 567 L1014 565 L1020 559 L1024 549 L1023 537 L1018 529 L1013 525 L1008 523 Z M702 523 L695 526 L689 532 L686 539 L686 552 L690 560 L697 566 L703 568 L712 568 L722 563 L726 558 L729 550 L729 539 L725 531 L718 525 L713 523 Z M1383 392 L1393 392 L1394 391 L1409 392 L1422 397 L1429 403 L1434 412 L1436 425 L1435 426 L1435 432 L1432 440 L1423 450 L1408 456 L1383 456 L1381 454 L1381 394 Z M1209 394 L1213 391 L1235 391 L1245 393 L1251 398 L1253 402 L1254 408 L1252 414 L1247 419 L1242 421 L1237 421 L1236 422 L1211 422 L1209 420 Z M713 394 L715 392 L720 392 L721 391 L743 392 L749 395 L753 400 L755 405 L754 413 L747 421 L743 423 L738 424 L715 424 L713 422 Z M1483 368 L1482 369 L1482 479 L1483 480 L1570 480 L1571 479 L1571 458 L1570 457 L1559 457 L1558 456 L1528 456 L1527 457 L1511 456 L1510 457 L1508 455 L1508 437 L1510 435 L1561 435 L1562 434 L1562 413 L1561 412 L1510 412 L1508 410 L1508 393 L1510 391 L1570 391 L1571 390 L1571 369 L1570 368 Z M1355 368 L1354 369 L1354 479 L1355 480 L1404 480 L1405 479 L1413 479 L1430 474 L1442 467 L1452 457 L1460 443 L1463 430 L1463 417 L1461 407 L1452 390 L1443 381 L1428 372 L1412 368 Z M1303 368 L1302 369 L1302 479 L1303 480 L1328 480 L1329 479 L1329 369 L1328 368 Z M1183 368 L1182 369 L1182 479 L1183 480 L1208 480 L1209 479 L1209 447 L1211 445 L1229 445 L1233 449 L1255 480 L1285 480 L1286 479 L1257 441 L1260 438 L1265 436 L1274 427 L1279 417 L1280 398 L1278 391 L1272 381 L1264 374 L1258 371 L1247 368 Z M1026 368 L1025 369 L1025 461 L1024 462 L1025 465 L1025 474 L1024 475 L1025 477 L1024 479 L1025 480 L1113 480 L1114 479 L1114 457 L1113 456 L1110 457 L1109 456 L1107 457 L1070 457 L1069 456 L1053 457 L1051 455 L1051 438 L1054 435 L1104 435 L1105 434 L1105 413 L1104 412 L1054 412 L1051 409 L1051 400 L1052 399 L1051 393 L1053 391 L1112 391 L1113 390 L1113 369 L1112 368 Z M973 368 L972 369 L972 479 L973 480 L998 480 L999 479 L999 369 L998 368 Z M843 369 L882 422 L882 424 L847 470 L841 479 L842 480 L871 480 L898 443 L903 447 L920 472 L927 480 L951 480 L957 478 L916 423 L917 420 L956 369 L955 368 L926 368 L899 404 L874 368 L844 368 Z M799 368 L798 369 L798 479 L799 480 L824 480 L825 479 L825 369 L824 368 Z M758 371 L747 368 L687 368 L686 369 L686 479 L687 480 L712 480 L713 479 L713 449 L715 447 L742 447 L752 445 L764 440 L775 429 L779 421 L781 413 L780 396 L778 390 L773 382 L767 376 Z M1626 366 L1610 370 L1601 375 L1594 382 L1588 395 L1588 408 L1591 416 L1598 424 L1611 431 L1614 431 L1629 436 L1637 437 L1645 440 L1650 445 L1650 451 L1645 456 L1640 458 L1625 458 L1615 455 L1598 445 L1584 461 L1584 463 L1598 473 L1610 478 L1625 481 L1641 481 L1656 477 L1665 472 L1671 466 L1677 453 L1677 438 L1673 429 L1663 420 L1647 414 L1622 408 L1616 403 L1615 397 L1622 390 L1635 389 L1647 392 L1661 400 L1674 380 L1667 375 L1650 368 L1639 367 L1638 366 Z M165 352 L185 376 L202 393 L210 398 L219 401 L290 401 L291 400 L252 350 L167 350 Z M562 290 L547 280 L535 274 L511 267 L505 267 L504 266 L404 266 L403 267 L389 309 L385 325 L417 381 L432 409 L434 407 L454 342 L456 340 L467 340 L468 339 L501 340 L514 345 L524 353 L533 367 L537 380 L537 399 L535 408 L530 419 L523 429 L515 436 L505 442 L491 446 L423 446 L421 443 L426 429 L426 425 L380 343 L378 346 L377 352 L368 377 L368 380 L361 401 L359 404 L354 419 L354 422 L348 437 L348 440 L343 452 L335 476 L335 479 L329 494 L329 497 L325 506 L325 509 L323 512 L323 515 L314 540 L314 543 L289 617 L290 620 L293 621 L366 621 L368 619 L371 610 L371 607 L385 566 L385 563 L398 522 L401 518 L486 518 L487 517 L495 517 L496 516 L512 514 L530 508 L548 499 L562 489 L580 471 L593 451 L603 426 L608 400 L608 380 L607 379 L607 370 L603 352 L598 338 L590 322 L578 305 Z";
const MARK_D = "M227 418 L256 453 L271 468 L275 470 L322 470 L339 419 L338 417 L300 417 L299 416 L275 416 L274 417 L229 416 Z M269 351 L269 353 L307 400 L345 400 L347 398 L348 392 L356 370 L356 367 L359 361 L351 350 L270 350 Z M97 272 L98 275 L107 284 L140 323 L146 329 L159 334 L167 334 L168 335 L186 335 L187 334 L202 334 L203 335 L206 334 L236 334 L237 335 L259 335 L260 334 L264 335 L266 334 L267 335 L366 334 L372 323 L370 317 L342 277 L335 269 L99 269 Z";
const FULL_VB = "87 256 1600 375";
const MARK_VB = "89 261 291 217";

/**
 * The Pixie Rides logo. White wordmark on navy grounds, navy on light.
 * showText={false} renders the orange swoosh mark alone.
 */
function Logo({
  variant = 'navy',
  size = 26,
  showText = true,
  style
}) {
  const fill = variant === 'white' ? '#FFFFFF' : '#08344F';
  if (!showText) return /*#__PURE__*/React.createElement("svg", {
    viewBox: MARK_VB,
    height: size * 1.2,
    width: size * 1.2 * (291 / 217),
    style: {
      display: 'inline-block',
      ...style
    },
    role: "img",
    "aria-label": "Pixie Rides mark"
  }, /*#__PURE__*/React.createElement("path", {
    d: MARK_D,
    fill: "var(--orange)"
  }));
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: FULL_VB,
    height: size * 1.9,
    width: size * 1.9 * (1600 / 375),
    style: {
      display: 'inline-block',
      ...style
    },
    role: "img",
    "aria-label": "Pixie Rides"
  }, /*#__PURE__*/React.createElement("path", {
    d: TEXT_D,
    fill: fill
  }), /*#__PURE__*/React.createElement("path", {
    d: MARK_D,
    fill: "var(--orange)"
  }));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/brand/NameSign.jsx
try { (() => {
/**
 * The name-sign — the card the driver holds at baggage claim, and a recurring
 * motif in social/app. White card, small navy wordmark, the passenger's name
 * large in display type. "We're the ones holding your name."
 */
function NameSign({
  name = 'The Alvarez Family',
  line = 'Pixie Rides',
  foot = 'Welcome to Orlando',
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      background: 'var(--white)',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--shadow-lifted)',
      padding: '30px 34px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      minWidth: 300,
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    variant: "navy",
    size: 15
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 40,
      lineHeight: 1.02,
      letterSpacing: '-0.03em',
      color: 'var(--sea)'
    }
  }, name), foot && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--ink-2)'
    }
  }, foot));
}
Object.assign(__ds_scope, { NameSign });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/NameSign.jsx", error: String((e && e.message) || e) }); }

// components/data/Badge.jsx
try { (() => {
/**
 * Small status/label chip. Green tone = confirmed/included (fill + white or
 * green-text). Neutral = quiet metadata. Never orange — orange is action only.
 */
function Badge({
  tone = 'neutral',
  children,
  style
}) {
  const tones = {
    neutral: {
      background: 'var(--sky-2)',
      color: 'var(--ink-2)'
    },
    confirmed: {
      background: 'rgba(78,158,122,.16)',
      color: 'var(--green-text)'
    },
    solid: {
      background: 'var(--green)',
      color: '#fff'
    },
    'on-dark': {
      background: 'rgba(168,205,226,.16)',
      color: 'var(--foam)'
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: '0.04em',
      padding: '5px 11px',
      borderRadius: 'var(--radius-pill)',
      ...tones[tone],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Badge.jsx", error: String((e && e.message) || e) }); }

// components/data/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The base surface. 14px radius, soft low shadow, no hard border — separation
 * comes from background shift + shadow + space. tone controls the surface.
 */
function Card({
  tone = 'white',
  pad = 24,
  texture = false,
  children,
  style,
  ...rest
}) {
  const tones = {
    white: {
      background: 'var(--white)',
      color: 'var(--ink)'
    },
    raised: {
      background: 'var(--sky-2)',
      color: 'var(--ink)'
    },
    dark: {
      background: 'var(--sea)',
      color: 'var(--foam)'
    },
    'dark-raised': {
      background: 'var(--sea-2)',
      color: 'var(--foam)'
    }
  };
  const isDark = tone === 'dark' || tone === 'dark-raised';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: 'var(--radius-card)',
      padding: pad,
      boxShadow: 'var(--shadow-card)',
      position: 'relative',
      overflow: 'hidden',
      ...tones[tone],
      ...style
    }
  }, rest), texture && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: isDark ? 'var(--dot-warm)' : 'var(--dot-ink)',
      backgroundSize: '16px 16px',
      opacity: isDark ? 0.5 : 0.6,
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Card.jsx", error: String((e && e.message) || e) }); }

// components/data/ListRow.jsx
try { (() => {
/**
 * Tappable list row for app lists — saved trips, addresses, settings.
 * ≥44px target. Icon slot, title + subtitle, optional trailing node/chevron.
 * Separation by background, not borders.
 */
function ListRow({
  leading = null,
  title,
  subtitle,
  trailing = null,
  onDark = false,
  chevron = false,
  onClick,
  style
}) {
  const titleC = onDark ? 'var(--sky)' : 'var(--ink)';
  const subC = onDark ? 'var(--foam-dim)' : 'var(--ink-2)';
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      minHeight: 56,
      padding: '10px 4px',
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }
  }, leading && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flex: '0 0 auto',
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      background: onDark ? 'var(--sea-2)' : 'var(--sky-2)',
      color: onDark ? 'var(--foam)' : 'var(--sea)'
    }
  }, leading), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 16,
      color: titleC,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: subC,
      marginTop: 2
    }
  }, subtitle)), trailing && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: '0 0 auto',
      color: subC
    }
  }, trailing), chevron && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      flex: '0 0 auto',
      color: subC,
      fontSize: 20,
      lineHeight: 1
    }
  }, "\u203A"));
}
Object.assign(__ds_scope, { ListRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ListRow.jsx", error: String((e && e.message) || e) }); }

// components/data/PriceDisplay.jsx
try { (() => {
/**
 * The price figure — the number the whole product exists to deliver.
 * Bricolage Grotesque 800, tight tracking, orange. "flat" and "taxes in"
 * live around it in quiet ink so the number is the loud thing.
 */
function PriceDisplay({
  amount = '$129',
  caption = 'flat · taxes in',
  size = 52,
  onDark = false,
  align = 'left'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      alignItems: align === 'center' ? 'center' : 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: size,
      letterSpacing: '-0.05em',
      lineHeight: 0.9,
      color: 'var(--orange)'
    }
  }, amount), caption && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: '0.02em',
      color: onDark ? 'var(--foam-dim)' : 'var(--ink-2)'
    }
  }, caption));
}
Object.assign(__ds_scope, { PriceDisplay });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/PriceDisplay.jsx", error: String((e && e.message) || e) }); }

// components/data/RouteChip.jsx
try { (() => {
/**
 * Route chip: "MCO → Disney". The origin/destination lockup used across
 * social, quote cards and list rows. Arrow is a quiet ink glyph, not orange.
 */
function RouteChip({
  from = 'MCO',
  to = 'Disney',
  onDark = false,
  size = 'md'
}) {
  const fs = size === 'lg' ? 22 : size === 'sm' ? 15 : 18;
  const color = onDark ? 'var(--foam)' : 'var(--ink)';
  const dim = onDark ? 'var(--foam-dim)' : 'var(--ink-2)';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: fs,
      letterSpacing: '-0.02em',
      color
    }
  }, /*#__PURE__*/React.createElement("span", null, from), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: dim,
      fontFamily: 'var(--font-body)',
      fontWeight: 400,
      fontSize: fs * 0.9,
      transform: 'translateY(-1px)'
    }
  }, "\u2192"), /*#__PURE__*/React.createElement("span", null, to));
}
Object.assign(__ds_scope, { RouteChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/RouteChip.jsx", error: String((e && e.message) || e) }); }

// components/feedback/TripStatus.jsx
try { (() => {
/**
 * Trip-status stepper — the emotional spine of the app.
 * Requested → Confirmed → Driver assigned → Arriving. Completed steps get a
 * green tick (confirmed meaning); the current step pulses in foam/white.
 * Orange is NOT used for status (it stays reserved for booking actions).
 */
function TripStatus({
  steps = [],
  current = 0,
  onDark = true,
  style
}) {
  const line = onDark ? 'rgba(168,205,226,.22)' : 'var(--sky-3)';
  const doneLine = 'var(--green)';
  const titleC = onDark ? 'var(--sky)' : 'var(--ink)';
  const dimC = onDark ? 'var(--foam-dim)' : 'var(--ink-2)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      ...style
    }
  }, steps.map((s, i) => {
    const done = i < current,
      cur = i === current,
      last = i === steps.length - 1;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 26,
        height: 26,
        borderRadius: '50%',
        flex: '0 0 auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: done ? 'var(--green)' : cur ? 'transparent' : onDark ? 'var(--sea-2)' : 'var(--sky-2)',
        border: cur ? `2.5px solid ${onDark ? 'var(--white)' : 'var(--sea)'}` : '0',
        boxShadow: cur ? `0 0 0 5px ${onDark ? 'rgba(255,255,255,.14)' : 'rgba(8,52,79,.10)'}` : 'none'
      }
    }, done && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 5,
        height: 9,
        borderRight: '2px solid #fff',
        borderBottom: '2px solid #fff',
        transform: 'rotate(45deg) translate(-1px,-1px)'
      }
    }), cur && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: onDark ? 'var(--white)' : 'var(--sea)'
      }
    })), !last && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 2,
        flex: 1,
        minHeight: 26,
        background: done ? doneLine : line,
        margin: '4px 0'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        paddingBottom: last ? 0 : 22
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        fontSize: 16,
        color: cur || done ? titleC : dimC
      }
    }, s.title), s.detail && /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        color: dimC,
        marginTop: 2
      }
    }, s.detail)));
  }));
}
Object.assign(__ds_scope, { TripStatus });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/TripStatus.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Pixie Rides primary action button.
 * Orange = "act / book" — the one loud thing on screen. Never decorative.
 * Text on orange is always On-Orange (#2B1206), never white (fails contrast).
 */
function Button({
  variant = 'primary',
  size = 'md',
  onDark = false,
  fullWidth = false,
  disabled = false,
  children,
  style,
  ...rest
}) {
  const heights = {
    sm: 44,
    md: 52,
    lg: 58
  };
  const pads = {
    sm: 20,
    md: 28,
    lg: 32
  };
  const h = heights[size] || heights.md;
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize: size === 'sm' ? 15 : 16,
    height: h,
    padding: `0 ${pads[size] || pads.md}px`,
    borderRadius: 'var(--radius-btn)',
    border: 0,
    cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none',
    width: fullWidth ? '100%' : 'auto',
    whiteSpace: 'nowrap',
    transition: 'background .15s ease, transform .05s ease, opacity .15s ease',
    opacity: disabled ? 0.45 : 1
  };
  const variants = {
    primary: {
      background: 'var(--orange)',
      color: 'var(--on-orange)'
    },
    secondary: onDark ? {
      background: 'transparent',
      color: 'var(--sky)',
      border: '2px solid rgba(234,244,250,.45)'
    } : {
      background: 'transparent',
      color: 'var(--sea)',
      border: '2px solid var(--sea)'
    },
    ghost: onDark ? {
      background: 'transparent',
      color: 'var(--foam)'
    } : {
      background: 'transparent',
      color: 'var(--ink-2)'
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    style: {
      ...base,
      ...variants[variant],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/IncludedRow.jsx
try { (() => {
/**
 * Included / confirmed marker row. Green fill tick + label.
 * The tick is the FILL green (#4E9E7A) with a white glyph. When the label
 * itself is a green word ("free"), that word uses Green-Text, never the fill.
 */
function IncludedRow({
  children,
  size = 18,
  onDark = false,
  style
}) {
  const tick = {
    flex: `0 0 ${size}px`,
    width: size,
    height: size,
    borderRadius: '50%',
    background: 'var(--green)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  };
  const glyphW = Math.round(size * 0.28);
  const glyphH = Math.round(size * 0.5);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      lineHeight: 1.45,
      color: onDark ? 'var(--foam)' : 'var(--ink)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: tick,
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: glyphW,
      height: glyphH,
      borderRight: '2px solid #fff',
      borderBottom: '2px solid #fff',
      transform: 'rotate(45deg) translate(-1px,-1px)'
    }
  })), /*#__PURE__*/React.createElement("span", null, children));
}
Object.assign(__ds_scope, { IncludedRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IncludedRow.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Pixie Rides text input / select field.
 * 50px tall, 16px text (below 16 iOS zooms), 12px radius, Sky-3 hairline,
 * white fill. Separates by background + shadow, not heavy borders.
 */
function Input({
  label,
  hint,
  as = 'input',
  leading = null,
  value,
  placeholder,
  onDark = false,
  style,
  ...rest
}) {
  const wrap = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: '100%'
  };
  const lbl = {
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: onDark ? 'var(--foam-dim)' : 'var(--ink-2)'
  };
  const field = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    height: 50,
    padding: '0 15px',
    borderRadius: 'var(--radius-input)',
    fontSize: 16,
    fontFamily: 'var(--font-body)',
    color: onDark ? 'var(--sky)' : 'var(--ink)',
    background: onDark ? 'var(--sea-2)' : 'var(--white)',
    border: onDark ? '1.5px solid rgba(168,205,226,.18)' : '1.5px solid var(--sky-3)',
    boxShadow: 'var(--shadow-card)',
    width: '100%'
  };
  const inputEl = {
    border: 0,
    outline: 'none',
    background: 'transparent',
    width: '100%',
    fontSize: 16,
    fontFamily: 'var(--font-body)',
    color: 'inherit'
  };
  const Tag = as === 'textarea' ? 'textarea' : 'input';
  return /*#__PURE__*/React.createElement("label", {
    style: {
      ...wrap,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: lbl
  }, label), /*#__PURE__*/React.createElement("span", {
    style: field
  }, leading && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      color: onDark ? 'var(--foam-dim)' : 'var(--ink-2)'
    }
  }, leading), /*#__PURE__*/React.createElement(Tag, _extends({
    style: inputEl,
    value: value,
    placeholder: placeholder
  }, rest))), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: onDark ? 'var(--foam-dim)' : 'var(--ink-2)'
    }
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TabBar.jsx
try { (() => {
/**
 * Bottom tab bar for the app. Navy field, foam-dim inactive, orange... no:
 * the active tab is marked with a brighter foam + the warm dot, NOT an orange
 * fill (orange stays reserved for booking actions). Safe-area aware.
 */
function TabBar({
  items = [],
  active = 0,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      background: 'var(--sea)',
      paddingTop: 8,
      paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      boxShadow: '0 -1px 0 rgba(168,205,226,.12)',
      ...style
    }
  }, items.map((it, i) => {
    const on = i === active;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      onClick: () => onChange && onChange(i),
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        padding: '4px 0',
        color: on ? 'var(--white)' : 'var(--foam-dim)',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        height: 24,
        alignItems: 'center'
      }
    }, it.icon), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: '0.02em'
      }
    }, it.label), on && /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        position: 'absolute',
        top: -8,
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: 'var(--orange)',
        boxShadow: '0 0 0 3px rgba(249,115,22,.25)'
      }
    }));
  }));
}
Object.assign(__ds_scope, { TabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TabBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/AppShell.jsx
try { (() => {
/* Shared helpers for the Pixie Rides app kit. Exported to window for other babel scripts. */
const NS = window.PixieRidesDesignSystem_457785;
function Icon({
  n,
  s = 22,
  c = 'currentColor',
  sw = 1.8
}) {
  const d = window.lucide && lucide.icons[n];
  if (!d) return null;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex'
    },
    dangerouslySetInnerHTML: {
      __html: d.toSvg({
        width: s,
        height: s,
        stroke: c,
        'stroke-width': sw
      })
    }
  });
}

/* A faux map panel — navy field, dot grid, a warm route line MCO→dest. */
function MapPanel({
  height = 220,
  label = 'Tracking your route'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height,
      background: 'var(--sea)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--dot-warm)',
      backgroundSize: '20px 20px',
      opacity: .45
    }
  }), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 390 220",
    width: "100%",
    height: "100%",
    style: {
      position: 'absolute',
      inset: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M40 180 C 120 180, 150 90, 240 80 S 340 40, 360 36",
    fill: "none",
    stroke: "rgba(249,115,22,.9)",
    strokeWidth: "3",
    strokeDasharray: "2 8",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "40",
    cy: "180",
    r: "7",
    fill: "var(--sea)",
    stroke: "#F97316",
    strokeWidth: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "360",
    cy: "36",
    r: "7",
    fill: "#F97316"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 16,
      bottom: 14,
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      color: 'var(--foam-dim)'
    }
  }, label));
}

/* Status bar + phone chrome bits */
function StatusBar({
  dark = true
}) {
  const c = dark ? 'var(--foam)' : 'var(--ink)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      color: c,
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 14,
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "signal",
    s: 16,
    c: c
  }), /*#__PURE__*/React.createElement(Icon, {
    n: "wifi",
    s: 16,
    c: c
  }), /*#__PURE__*/React.createElement(Icon, {
    n: "battery-full",
    s: 18,
    c: c
  })));
}
Object.assign(window, {
  NS,
  Icon,
  MapPanel,
  StatusBar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/DriverHereScreen.jsx
try { (() => {
/* DriverHere — the signature moment. Full navy, the name-sign the driver holds. */
const {
  NameSign,
  Button,
  Logo
} = window.NS;
function DriverHereScreen({
  onDone
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'hidden',
      background: 'var(--sea)',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--dot-warm)',
      backgroundSize: '20px 20px',
      opacity: .5
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 26,
      textAlign: 'center',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: '.18em',
      textTransform: 'uppercase',
      color: 'var(--foam-dim)'
    }
  }, "Baggage claim 4 \xB7 door A"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 30,
      letterSpacing: '-0.022em',
      color: '#fff',
      lineHeight: 1.08
    }
  }, "Look for Marcus.", /*#__PURE__*/React.createElement("br", null), "He's holding your name."), /*#__PURE__*/React.createElement(NameSign, {
    name: "The Alvarez Family",
    foot: "Welcome to Orlando",
    style: {
      transform: 'rotate(-2deg)',
      maxWidth: 300
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      color: 'var(--foam)',
      maxWidth: '26ch'
    }
  }, "White Chevy Suburban \xB7 plate FL 8XK-221. Car seats are already installed.")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      padding: '0 20px 26px'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onDone
  }, "I see them")));
}
Object.assign(window, {
  DriverHereScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/DriverHereScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/HomeScreen.jsx
try { (() => {
/* Home — enter a trip. Navy hero with the light trail, quote form below. */
const {
  Logo,
  Input,
  Button,
  RouteChip,
  LightTrail,
  IncludedRow
} = window.NS;
function HomeScreen({
  onQuote
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      background: 'var(--sea)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 22px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "white",
    size: 22
  }), /*#__PURE__*/React.createElement(window.Icon, {
    n: "menu",
    s: 24,
    c: "var(--foam)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 32,
      lineHeight: 1.05,
      letterSpacing: '-0.022em',
      color: '#fff',
      marginBottom: 6
    }
  }, "Where are we", /*#__PURE__*/React.createElement("br", null), "meeting you?"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      color: 'var(--foam)',
      marginBottom: 20
    }
  }, "Flat price, quoted before you book."), /*#__PURE__*/React.createElement(LightTrail, {
    height: 130,
    labels: ['You land', "We hold your name", 'Kids in bed'],
    style: {
      marginBottom: 22
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Pickup",
    value: "MCO \u2014 Orlando International",
    onDark: true,
    readOnly: true,
    leading: /*#__PURE__*/React.createElement(window.Icon, {
      n: "plane-landing",
      s: 18,
      c: "var(--foam-dim)"
    })
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Drop-off",
    value: "Disney's Grand Floridian",
    onDark: true,
    readOnly: true,
    leading: /*#__PURE__*/React.createElement(window.Icon, {
      n: "map-pin",
      s: 18,
      c: "var(--foam-dim)"
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Passengers",
    value: "2 adults, 1 child",
    onDark: true,
    readOnly: true,
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Flight",
    value: "DL 1487",
    onDark: true,
    readOnly: true,
    style: {
      flex: '0 0 120px'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onQuote
  }, "See my price")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(IncludedRow, {
    onDark: true
  }, "Taxes, tolls & parking always included"), /*#__PURE__*/React.createElement(IncludedRow, {
    onDark: true
  }, "Car seats free, fitted before we leave"))));
}
Object.assign(window, {
  HomeScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/QuoteScreen.jsx
try { (() => {
/* Quote — the flat price lands. Card composes RouteChip + PriceDisplay + included list. */
const {
  Card,
  RouteChip,
  PriceDisplay,
  IncludedRow,
  Button,
  Badge
} = window.NS;
function QuoteScreen({
  onBack,
  onRequest
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      background: 'var(--sky)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '4px 20px 14px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      background: 'transparent',
      border: 0,
      cursor: 'pointer',
      padding: 4
    }
  }, /*#__PURE__*/React.createElement(window.Icon, {
    n: "chevron-left",
    s: 26,
    c: "var(--sea)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 16,
      color: 'var(--ink)'
    }
  }, "Your price")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 20px 24px'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "white",
    pad: 26,
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement(RouteChip, {
    from: "MCO",
    to: "Grand Floridian",
    size: "md"
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "confirmed"
  }, "Flight DL 1487 tracked")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: 'var(--ink-2)',
      marginBottom: 18
    }
  }, "Private SUV \xB7 up to 6 \xB7 arrives 11:40pm"), /*#__PURE__*/React.createElement(PriceDisplay, {
    amount: "$129",
    caption: "flat \xB7 taxes, tolls & car seats included",
    size: 58
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--sky-3)',
      margin: '20px 0'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 11
    }
  }, /*#__PURE__*/React.createElement(IncludedRow, null, "Meet & greet at baggage claim with your name"), /*#__PURE__*/React.createElement(IncludedRow, null, "2 car seats, fitted before we leave"), /*#__PURE__*/React.createElement(IncludedRow, null, "We watch DL 1487 \u2014 pickup moves if you're late"))), /*#__PURE__*/React.createElement(Card, {
    tone: "raised",
    pad: 18,
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 15,
      color: 'var(--ink)'
    }
  }, "Add return trip"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      color: 'var(--ink-2)'
    }
  }, "Grand Floridian \u2192 MCO \xB7 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--green-text)',
      fontWeight: 600
    }
  }, "save $18"))), /*#__PURE__*/React.createElement(window.Icon, {
    n: "plus",
    s: 22,
    c: "var(--sea)"
  }))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onRequest
  }, "Request this ride"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      color: 'var(--ink-2)',
      marginTop: 12
    }
  }, "You're not charged until a human confirms.")));
}
Object.assign(window, {
  QuoteScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/QuoteScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/TripScreen.jsx
try { (() => {
/* Trip — status tracking on navy. Map + TripStatus stepper + driver card. */
const {
  Card,
  TripStatus,
  Button,
  Badge
} = window.NS;
function TripScreen({
  current,
  onAdvance,
  onDriverHere
}) {
  const steps = [{
    title: 'Request received',
    detail: '11:42pm · we\u2019re confirming a driver'
  }, {
    title: 'Confirmed by dispatch',
    detail: '11:48pm'
  }, {
    title: 'Driver assigned',
    detail: 'Marcus \u00b7 white Chevy Suburban \u00b7 FL 8XK-221'
  }, {
    title: 'Arriving \u2014 holding your name',
    detail: 'Baggage claim 4, door A'
  }];
  const atEnd = current >= steps.length - 1;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      background: 'var(--sea)'
    }
  }, /*#__PURE__*/React.createElement(window.MapPanel, {
    height: 210,
    label: "Marcus is 6 min away"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 20px 26px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 22,
      letterSpacing: '-0.02em',
      color: '#fff'
    }
  }, "MCO \u2192 Grand Floridian"), /*#__PURE__*/React.createElement(Badge, {
    tone: "on-dark"
  }, "$129 flat")), /*#__PURE__*/React.createElement(Card, {
    tone: "dark-raised",
    pad: 22,
    texture: true,
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(TripStatus, {
    current: current,
    steps: steps
  })), current >= 2 && /*#__PURE__*/React.createElement(Card, {
    tone: "dark-raised",
    pad: 16,
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: '50%',
      background: 'var(--sea-3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(window.Icon, {
    n: "user-round",
    s: 24,
    c: "var(--foam)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 16,
      color: '#fff'
    }
  }, "Marcus D."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      color: 'var(--foam-dim)'
    }
  }, "White Suburban \xB7 4.9 \u2605 \xB7 1,200 airport runs")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 10,
      background: 'var(--sea-3)',
      border: 0,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(window.Icon, {
    n: "message-circle",
    s: 20,
    c: "var(--foam)"
  })), /*#__PURE__*/React.createElement("button", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 10,
      background: 'var(--sea-3)',
      border: 0,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(window.Icon, {
    n: "phone",
    s: 20,
    c: "var(--foam)"
  }))))), atEnd ? /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onDriverHere
  }, "Your driver is here \u2192") : /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    onDark: true,
    fullWidth: true,
    onClick: onAdvance
  }, "Advance status (demo)")));
}
Object.assign(window, {
  TripScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/TripScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.LightTrail = __ds_scope.LightTrail;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.NameSign = __ds_scope.NameSign;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.ListRow = __ds_scope.ListRow;

__ds_ns.PriceDisplay = __ds_scope.PriceDisplay;

__ds_ns.RouteChip = __ds_scope.RouteChip;

__ds_ns.TripStatus = __ds_scope.TripStatus;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IncludedRow = __ds_scope.IncludedRow;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.TabBar = __ds_scope.TabBar;

})();
