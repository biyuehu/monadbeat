INSERT INTO problem (slug, title, difficulty, problem_type, category, remark, is_published, judge_config)
VALUES (
  'map-filterwithkey',
  'Identify the type of Map.filterWithKey',
  2,
  'infer_type',
  ARRAY['Data.Map', 'higher-order'],
  NULL,
  true,
  '{"problem_type":"infer_type","scaffold":"import qualified Data.Map as Map\n\ntype CorrectSig = forall k a. (k -> a -> Bool) -> Map.Map k a -> Map.Map k a\ntype UserSig = {{USER_CODE}}\n\ncheck1 :: CorrectSig -> UserSig\ncheck1 f = f\n\ncheck2 :: UserSig -> CorrectSig\ncheck2 f = f\n\nref :: CorrectSig\nref = Map.filterWithKey","display_snippet":"Map.filterWithKey"}'
);

INSERT INTO problem (slug, title, difficulty, problem_type, category, remark, is_published, judge_config)
VALUES (
  'sort-descending',
  'Sort a list in descending order',
  2,
  'find_function',
  ARRAY['Data.List', 'sorting'],
  NULL,
  true,
  '{"problem_type":"find_function","scaffold":"import Data.List (sortOn)\nimport Data.Ord (Down(..))\n\ntarget :: [Int] -> [Int]\ntarget = {{USER_CODE}}","display_snippet":"[Int] -> [Int]"}'
);

INSERT INTO problem (slug, title, difficulty, problem_type, category, remark, is_published, judge_config)
VALUES (
  'laziness-take-error',
  'Laziness with take and error',
  1,
  'predict_behavior',
  ARRAY['laziness', 'evaluation'],
  NULL,
  true,
  '{"problem_type":"predict_behavior","display_code":"xs = 1 : 2 : error \"boom\" : []\nresult = take 2 xs","options":["throw exception \"boom\"","return [1, 2] normally","compile error"],"correct_index":1}'
);