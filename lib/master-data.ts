export interface SKUItem {
  skuId: string;
  status: "Active" | "Inactive";
  skuName: string;
  mainUom: string;
  altUom: string;
}

export const SKU_MASTER: SKUItem[] = [
  { skuId: "SKU1001", status: "Inactive", skuName: "Good Life RBO 1 LTR PP (1*12)", mainUom: "Box", altUom: "KGS" },
  { skuId: "SKU1002", status: "Active", skuName: "Good Life RBO 5 LTR JAR (1*04)", mainUom: "Box", altUom: "KGS" },
  { skuId: "SKU1003", status: "Active", skuName: "Good Life RBO 820 GMS PP (1*12)", mainUom: "Box", altUom: "KGS" },
  { skuId: "SKU1004", status: "Active", skuName: "HK RBO 12.5 KGS JAR", mainUom: "Jar", altUom: "KGS" },
  { skuId: "SKU1005", status: "Active", skuName: "HK RBO 13 KGS JAR", mainUom: "Jar", altUom: "KGS" },
  { skuId: "SKU1006", status: "Active", skuName: "HK RBO 13 KGS TIN", mainUom: "Tin", altUom: "KGS" },
  { skuId: "SKU1007", status: "Active", skuName: "HK RBO 15 KGS BKT", mainUom: "Bkt", altUom: "KGS" },
  { skuId: "SKU1008", status: "Active", skuName: "HK RBO 15 KGS JAR", mainUom: "Jar", altUom: "KGS" },
  { skuId: "SKU1009", status: "Active", skuName: "HK RBO 15 KGS TIN", mainUom: "Tin", altUom: "KGS" },
  { skuId: "SKU1010", status: "Active", skuName: "HK RBO 15 LTR BKT (13.650 KGS)", mainUom: "Bkt", altUom: "KGS" },
  { skuId: "SKU1011", status: "Active", skuName: "HK RBO 15 LTR TIN (13.650 KGS)", mainUom: "Tin", altUom: "KGS" },
  { skuId: "SKU1012", status: "Active", skuName: "HK RBO 1.8 KGS JAR (1*08)", mainUom: "Jar", altUom: "KGS" },
  { skuId: "SKU1013", status: "Active", skuName: "HK RBO 1 LTR PP (1*12)", mainUom: "Box", altUom: "KGS" },
  { skuId: "SKU1014", status: "Active", skuName: "HK RBO 2 LTR JAR (1*08)", mainUom: "Jar", altUom: "KGS" },
  { skuId: "SKU1015", status: "Active", skuName: "HK RBO 300 GMS PP (1*24)", mainUom: "Box", altUom: "KGS" },
  { skuId: "SKU1016", status: "Active", skuName: "HK RBO 300 MLT PP (1*24)", mainUom: "Box", altUom: "KGS" },
  { skuId: "SKU1017", status: "Active", skuName: "HK RBO 375 MLT PP (1*24)", mainUom: "Box", altUom: "KGS" },
  { skuId: "SKU1018", status: "Active", skuName: "HK RBO 400 MLT PP (1*24)", mainUom: "Box", altUom: "KGS" },
  { skuId: "SKU1019", status: "Active", skuName: "HK RBO 4.2 KGS JAR (1*04)", mainUom: "Jar", altUom: "KGS" },
  { skuId: "SKU1020", status: "Active", skuName: "HK RBO 435 MLT PP (1*24)", mainUom: "Box", altUom: "KGS" },
  { skuId: "SKU1021", status: "Active", skuName: "HK RBO 455 MLT BTI (1*24)", mainUom: "Box", altUom: "KGS" },
  { skuId: "SKU1022", status: "Active", skuName: "HK RBO 455 MLT PP (1*24)", mainUom: "Box", altUom: "KGS" },
  { skuId: "SKU1023", status: "Active", skuName: "HK RBO 495 MLT PP (1*24)", mainUom: "Box", altUom: "KGS" },
  { skuId: "SKU1024", status: "Active", skuName: "HK RBO 4 KGS JAR (1*04)", mainUom: "Jar", altUom: "KGS" },
  { skuId: "SKU1025", status: "Active", skuName: "HK RBO 500 MLT PP (1*24)", mainUom: "Box", altUom: "KGS" },
];
