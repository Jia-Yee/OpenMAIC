import { initDb, getDb } from './index';
import { subjects, textbooks, grades, courses, eq } from './schema';

const SEED_DATA = {
  subjects: [
    { id: 'subject-math', name: '数学', code: 'math', description: '数学思维训练课程', sortOrder: 0 },
    { id: 'subject-programming', name: '编程', code: 'programming', description: '编程与算法思维课程', sortOrder: 3 },
    { id: 'subject-chinese', name: '语文', code: 'chinese', description: '语文阅读与写作课程', sortOrder: 1 },
    { id: 'subject-english', name: '英语', code: 'english', description: '英语听说读写训练', sortOrder: 2 },
  ],
  textbooks: [
    { id: 'textbook-math-rjb', subjectId: 'subject-math', name: '人教版', publisher: '人民教育出版社', gradeRange: '1-6年级', sortOrder: 0 },
    { id: 'textbook-math-bsdb', subjectId: 'subject-math', name: '北师大版', publisher: '北京师范大学出版社', gradeRange: '1-6年级', sortOrder: 1 },
    { id: 'textbook-math-sjb', subjectId: 'subject-math', name: '苏教版', publisher: '江苏教育出版社', gradeRange: '1-6年级', sortOrder: 2 },
    { id: 'textbook-cpp-noip', subjectId: 'subject-programming', name: 'C++ · GESP考级体系', publisher: 'CCF中国计算机学会', gradeRange: '3-6年级', sortOrder: 0 },
    { id: 'textbook-python-basic', subjectId: 'subject-programming', name: 'Python · GESP考级体系', publisher: '韦达学习', gradeRange: '3-6年级', sortOrder: 1 },
    { id: 'textbook-chinese-rjb', subjectId: 'subject-chinese', name: '人教版语文', publisher: '人民教育出版社', gradeRange: '1-6年级', sortOrder: 0 },
    { id: 'textbook-english-pep', subjectId: 'subject-english', name: 'PEP人教版英语', publisher: '人民教育出版社', gradeRange: '3-6年级', sortOrder: 0 },
  ],
  grades: [
    // 人教版
    { id: 'grade-rjb-1a', textbookId: 'textbook-math-rjb', name: '一年级上册', price: 199, sortOrder: 0 },
    { id: 'grade-rjb-1b', textbookId: 'textbook-math-rjb', name: '一年级下册', price: 199, sortOrder: 1 },
    { id: 'grade-rjb-2a', textbookId: 'textbook-math-rjb', name: '二年级上册', price: 199, sortOrder: 2 },
    { id: 'grade-rjb-2b', textbookId: 'textbook-math-rjb', name: '二年级下册', price: 199, sortOrder: 3 },
    { id: 'grade-rjb-3a', textbookId: 'textbook-math-rjb', name: '三年级上册', price: 249, sortOrder: 4 },
    { id: 'grade-rjb-3b', textbookId: 'textbook-math-rjb', name: '三年级下册', price: 249, sortOrder: 5 },

    // C++ GESP考级体系（1-8级）
    { id: 'grade-cpp-3a', textbookId: 'textbook-cpp-noip', name: 'C++ GESP 1级', price: 299, sortOrder: 0 },
    { id: 'grade-cpp-3b', textbookId: 'textbook-cpp-noip', name: 'C++ GESP 2级', price: 299, sortOrder: 1 },
    { id: 'grade-cpp-4a', textbookId: 'textbook-cpp-noip', name: 'C++ GESP 3级', price: 299, sortOrder: 2 },
    { id: 'grade-cpp-4b', textbookId: 'textbook-cpp-noip', name: 'C++ GESP 4级', price: 349, sortOrder: 3 },
    { id: 'grade-cpp-5a', textbookId: 'textbook-cpp-noip', name: 'C++ GESP 5级', price: 349, sortOrder: 4 },
    { id: 'grade-cpp-5b', textbookId: 'textbook-cpp-noip', name: 'C++ GESP 6级', price: 349, sortOrder: 5 },
    { id: 'grade-cpp-6a', textbookId: 'textbook-cpp-noip', name: 'C++ GESP 7级', price: 399, sortOrder: 6 },
    { id: 'grade-cpp-6b', textbookId: 'textbook-cpp-noip', name: 'C++ GESP 8级', price: 399, sortOrder: 7 },

    // Python GESP考级体系（1-8级）
    { id: 'grade-py-3a', textbookId: 'textbook-python-basic', name: 'Python GESP 1级', price: 199, sortOrder: 0 },
    { id: 'grade-py-3b', textbookId: 'textbook-python-basic', name: 'Python GESP 2级', price: 199, sortOrder: 1 },
    { id: 'grade-py-4a', textbookId: 'textbook-python-basic', name: 'Python GESP 3级', price: 249, sortOrder: 2 },
    { id: 'grade-py-4b', textbookId: 'textbook-python-basic', name: 'Python GESP 4级', price: 249, sortOrder: 3 },
    { id: 'grade-py-5a', textbookId: 'textbook-python-basic', name: 'Python GESP 5级', price: 249, sortOrder: 4 },
    { id: 'grade-py-5b', textbookId: 'textbook-python-basic', name: 'Python GESP 6级', price: 249, sortOrder: 5 },
    { id: 'grade-py-6a', textbookId: 'textbook-python-basic', name: 'Python GESP 7级', price: 299, sortOrder: 6 },
    { id: 'grade-py-6b', textbookId: 'textbook-python-basic', name: 'Python GESP 8级', price: 299, sortOrder: 7 },

    // 语文人教版（1-6年级）
    { id: 'grade-chinese-rjb-1a', textbookId: 'textbook-chinese-rjb', name: '一年级上册', price: 199, sortOrder: 0 },
    { id: 'grade-chinese-rjb-1b', textbookId: 'textbook-chinese-rjb', name: '一年级下册', price: 199, sortOrder: 1 },
    { id: 'grade-chinese-rjb-2a', textbookId: 'textbook-chinese-rjb', name: '二年级上册', price: 199, sortOrder: 2 },
    { id: 'grade-chinese-rjb-2b', textbookId: 'textbook-chinese-rjb', name: '二年级下册', price: 199, sortOrder: 3 },
    { id: 'grade-chinese-rjb-3a', textbookId: 'textbook-chinese-rjb', name: '三年级上册', price: 249, sortOrder: 4 },
    { id: 'grade-chinese-rjb-3b', textbookId: 'textbook-chinese-rjb', name: '三年级下册', price: 249, sortOrder: 5 },
    { id: 'grade-chinese-rjb-4a', textbookId: 'textbook-chinese-rjb', name: '四年级上册', price: 249, sortOrder: 6 },
    { id: 'grade-chinese-rjb-4b', textbookId: 'textbook-chinese-rjb', name: '四年级下册', price: 249, sortOrder: 7 },
    { id: 'grade-chinese-rjb-5a', textbookId: 'textbook-chinese-rjb', name: '五年级上册', price: 299, sortOrder: 8 },
    { id: 'grade-chinese-rjb-5b', textbookId: 'textbook-chinese-rjb', name: '五年级下册', price: 299, sortOrder: 9 },
    { id: 'grade-chinese-rjb-6a', textbookId: 'textbook-chinese-rjb', name: '六年级上册', price: 299, sortOrder: 10 },
    { id: 'grade-chinese-rjb-6b', textbookId: 'textbook-chinese-rjb', name: '六年级下册', price: 299, sortOrder: 11 },

    // 英语PEP人教版（3-6年级）
    { id: 'grade-english-pep-3a', textbookId: 'textbook-english-pep', name: '三年级上册', price: 199, sortOrder: 0 },
    { id: 'grade-english-pep-3b', textbookId: 'textbook-english-pep', name: '三年级下册', price: 199, sortOrder: 1 },
    { id: 'grade-english-pep-4a', textbookId: 'textbook-english-pep', name: '四年级上册', price: 199, sortOrder: 2 },
    { id: 'grade-english-pep-4b', textbookId: 'textbook-english-pep', name: '四年级下册', price: 199, sortOrder: 3 },
    { id: 'grade-english-pep-5a', textbookId: 'textbook-english-pep', name: '五年级上册', price: 249, sortOrder: 4 },
    { id: 'grade-english-pep-5b', textbookId: 'textbook-english-pep', name: '五年级下册', price: 249, sortOrder: 5 },
    { id: 'grade-english-pep-6a', textbookId: 'textbook-english-pep', name: '六年级上册', price: 249, sortOrder: 6 },
    { id: 'grade-english-pep-6b', textbookId: 'textbook-english-pep', name: '六年级下册', price: 249, sortOrder: 7 },
  ],
  courses: [
    // 一年级上册
    { id: 'course-rjb-1a-01', gradeId: 'grade-rjb-1a', title: '数一数', description: '认识1-10以内的数', sortOrder: 0 },
    { id: 'course-rjb-1a-02', gradeId: 'grade-rjb-1a', title: '比一比', description: '学习比较大小、长短、高矮', sortOrder: 1 },
    { id: 'course-rjb-1a-03', gradeId: 'grade-rjb-1a', title: '1-5的认识和加减法', description: '认识数字1-5，学习加减法', sortOrder: 2 },
    { id: 'course-rjb-1a-04', gradeId: 'grade-rjb-1a', title: '认识图形（一）', description: '认识基本的平面图形', sortOrder: 3 },
    { id: 'course-rjb-1a-05', gradeId: 'grade-rjb-1a', title: '6-10的认识和加减法', description: '认识数字6-10，学习加减法', sortOrder: 4 },
    
    // 一年级下册
    { id: 'course-rjb-1b-01', gradeId: 'grade-rjb-1b', title: '认识图形（二）', description: '认识更多的平面图形', sortOrder: 0 },
    { id: 'course-rjb-1b-02', gradeId: 'grade-rjb-1b', title: '20以内的退位减法', description: '学习退位减法', sortOrder: 1 },
    { id: 'course-rjb-1b-03', gradeId: 'grade-rjb-1b', title: '分类与整理', description: '学习分类方法', sortOrder: 2 },
    { id: 'course-rjb-1b-04', gradeId: 'grade-rjb-1b', title: '100以内数的认识', description: '认识100以内的数', sortOrder: 3 },
    { id: 'course-rjb-1b-05', gradeId: 'grade-rjb-1b', title: '认识人民币', description: '学习人民币的使用', sortOrder: 4 },
    
    // 二年级上册
    { id: 'course-rjb-2a-01', gradeId: 'grade-rjb-2a', title: '长度单位', description: '认识厘米和米', sortOrder: 0 },
    { id: 'course-rjb-2a-02', gradeId: 'grade-rjb-2a', title: '100以内的加法和减法（二）', description: '进位加法和退位减法', sortOrder: 1 },
    { id: 'course-rjb-2a-03', gradeId: 'grade-rjb-2a', title: '角的初步认识', description: '认识角的概念', sortOrder: 2 },
    { id: 'course-rjb-2a-04', gradeId: 'grade-rjb-2a', title: '表内乘法（一）', description: '学习乘法口诀', sortOrder: 3 },
    { id: 'course-rjb-2a-05', gradeId: 'grade-rjb-2a', title: '观察物体', description: '从不同角度观察', sortOrder: 4 },
    
    // 二年级下册
    { id: 'course-rjb-2b-01', gradeId: 'grade-rjb-2b', title: '数据收集整理', description: '学习统计方法', sortOrder: 0 },
    { id: 'course-rjb-2b-02', gradeId: 'grade-rjb-2b', title: '表内除法（一）', description: '学习除法概念', sortOrder: 1 },
    { id: 'course-rjb-2b-03', gradeId: 'grade-rjb-2b', title: '图形的运动', description: '学习平移和旋转', sortOrder: 2 },
    { id: 'course-rjb-2b-04', gradeId: 'grade-rjb-2b', title: '表内除法（二）', description: '继续学习除法', sortOrder: 3 },
    { id: 'course-rjb-2b-05', gradeId: 'grade-rjb-2b', title: '混合运算', description: '学习运算顺序', sortOrder: 4 },
    
    // 三年级上册
    { id: 'course-rjb-3a-01', gradeId: 'grade-rjb-3a', title: '时、分、秒', description: '认识时间单位', sortOrder: 0 },
    { id: 'course-rjb-3a-02', gradeId: 'grade-rjb-3a', title: '万以内的加法和减法（一）', description: '大数加减法', sortOrder: 1 },
    { id: 'course-rjb-3a-03', gradeId: 'grade-rjb-3a', title: '测量', description: '认识毫米、分米、千米', sortOrder: 2 },
    { id: 'course-rjb-3a-04', gradeId: 'grade-rjb-3a', title: '倍的认识', description: '学习倍数概念', sortOrder: 3 },
    { id: 'course-rjb-3a-05', gradeId: 'grade-rjb-3a', title: '多位数乘一位数', description: '学习乘法运算', sortOrder: 4 },
    
    // 三年级下册
    { id: 'course-rjb-3b-01', gradeId: 'grade-rjb-3b', title: '位置与方向', description: '认识八个方向', sortOrder: 0 },
    { id: 'course-rjb-3b-02', gradeId: 'grade-rjb-3b', title: '除数是一位数的除法', description: '学习除法运算', sortOrder: 1 },
    { id: 'course-rjb-3b-03', gradeId: 'grade-rjb-3b', title: '复式统计表', description: '学习复杂统计', sortOrder: 2 },
    { id: 'course-rjb-3b-04', gradeId: 'grade-rjb-3b', title: '两位数乘两位数', description: '学习乘法运算', sortOrder: 3 },
    { id: 'course-rjb-3b-05', gradeId: 'grade-rjb-3b', title: '面积', description: '认识面积单位', sortOrder: 4 },

    // C++入门·基础语法
    { id: 'course-cpp-3a-01', gradeId: 'grade-cpp-3a', title: '初识C++与开发环境', description: '安装IDE、编写第一个程序', sortOrder: 0 },
    { id: 'course-cpp-3a-02', gradeId: 'grade-cpp-3a', title: '变量与数据类型', description: 'int、double、char等基本类型', sortOrder: 1 },
    { id: 'course-cpp-3a-03', gradeId: 'grade-cpp-3a', title: '输入与输出', description: 'cin/cout和格式化输出', sortOrder: 2 },
    { id: 'course-cpp-3a-04', gradeId: 'grade-cpp-3a', title: '算术运算符', description: '加减乘除与取模运算', sortOrder: 3 },
    { id: 'course-cpp-3a-05', gradeId: 'grade-cpp-3a', title: '赋值与类型转换', description: '隐式转换与强制转换', sortOrder: 4 },

    // C++入门·循环与数组
    { id: 'course-cpp-3b-01', gradeId: 'grade-cpp-3b', title: 'if条件判断', description: 'if-else与嵌套条件', sortOrder: 0 },
    { id: 'course-cpp-3b-02', gradeId: 'grade-cpp-3b', title: 'for循环', description: '计数循环与累加求和', sortOrder: 1 },
    { id: 'course-cpp-3b-03', gradeId: 'grade-cpp-3b', title: 'while循环', description: '条件循环与死循环避免', sortOrder: 2 },
    { id: 'course-cpp-3b-04', gradeId: 'grade-cpp-3b', title: '一维数组', description: '数组定义、遍历与查找', sortOrder: 3 },
    { id: 'course-cpp-3b-05', gradeId: 'grade-cpp-3b', title: '字符串基础', description: 'string类与字符操作', sortOrder: 4 },

    // C++进阶·函数与结构体
    { id: 'course-cpp-4a-01', gradeId: 'grade-cpp-4a', title: '函数的定义与调用', description: '参数传递与返回值', sortOrder: 0 },
    { id: 'course-cpp-4a-02', gradeId: 'grade-cpp-4a', title: '递归函数', description: '递归思想与递推关系', sortOrder: 1 },
    { id: 'course-cpp-4a-03', gradeId: 'grade-cpp-4a', title: '结构体', description: '自定义数据类型', sortOrder: 2 },
    { id: 'course-cpp-4a-04', gradeId: 'grade-cpp-4a', title: '二维数组', description: '矩阵操作与方向数组', sortOrder: 3 },
    { id: 'course-cpp-4a-05', gradeId: 'grade-cpp-4a', title: '排序算法入门', description: '冒泡排序与选择排序', sortOrder: 4 },

    // C++进阶·算法基础
    { id: 'course-cpp-4b-01', gradeId: 'grade-cpp-4b', title: '二分查找', description: '有序序列的快速查找', sortOrder: 0 },
    { id: 'course-cpp-4b-02', gradeId: 'grade-cpp-4b', title: '前缀和与差分', description: '区间求和与区间修改', sortOrder: 1 },
    { id: 'course-cpp-4b-03', gradeId: 'grade-cpp-4b', title: '栈与队列', description: 'STL容器基础使用', sortOrder: 2 },
    { id: 'course-cpp-4b-04', gradeId: 'grade-cpp-4b', title: '贪心算法入门', description: '局部最优策略', sortOrder: 3 },
    { id: 'course-cpp-4b-05', gradeId: 'grade-cpp-4b', title: '简单数学问题', description: '最大公约数与素数判定', sortOrder: 4 },

    // C++高级·排序与搜索
    { id: 'course-cpp-5a-01', gradeId: 'grade-cpp-5a', title: '归并排序', description: '分治思想与合并操作', sortOrder: 0 },
    { id: 'course-cpp-5a-02', gradeId: 'grade-cpp-5a', title: '快速排序', description: '分区策略与平均复杂度', sortOrder: 1 },
    { id: 'course-cpp-5a-03', gradeId: 'grade-cpp-5a', title: '深度优先搜索', description: 'DFS与回溯法', sortOrder: 2 },
    { id: 'course-cpp-5a-04', gradeId: 'grade-cpp-5a', title: '广度优先搜索', description: 'BFS与最短路径', sortOrder: 3 },
    { id: 'course-cpp-5a-05', gradeId: 'grade-cpp-5a', title: '全排列与组合', description: '枚举与剪枝技巧', sortOrder: 4 },

    // C++高级·动态规划入门
    { id: 'course-cpp-5b-01', gradeId: 'grade-cpp-5b', title: '动态规划思想', description: '状态定义与转移方程', sortOrder: 0 },
    { id: 'course-cpp-5b-02', gradeId: 'grade-cpp-5b', title: '背包问题', description: '0-1背包与完全背包', sortOrder: 1 },
    { id: 'course-cpp-5b-03', gradeId: 'grade-cpp-5b', title: '最长子序列问题', description: 'LIS与LCS', sortOrder: 2 },
    { id: 'course-cpp-5b-04', gradeId: 'grade-cpp-5b', title: '区间DP入门', description: '石子合并与矩阵链乘', sortOrder: 3 },
    { id: 'course-cpp-5b-05', gradeId: 'grade-cpp-5b', title: '记忆化搜索', description: '递归+缓存的技巧', sortOrder: 4 },

    // C++竞赛·图论与贪心
    { id: 'course-cpp-6a-01', gradeId: 'grade-cpp-6a', title: '图的表示与遍历', description: '邻接表与邻接矩阵', sortOrder: 0 },
    { id: 'course-cpp-6a-02', gradeId: 'grade-cpp-6a', title: '最短路径算法', description: 'Dijkstra与Floyd', sortOrder: 1 },
    { id: 'course-cpp-6a-03', gradeId: 'grade-cpp-6a', title: '最小生成树', description: 'Kruskal与Prim算法', sortOrder: 2 },
    { id: 'course-cpp-6a-04', gradeId: 'grade-cpp-6a', title: '拓扑排序', description: '有向无环图与依赖关系', sortOrder: 3 },
    { id: 'course-cpp-6a-05', gradeId: 'grade-cpp-6a', title: '高级贪心策略', description: '区间调度与哈夫曼编码', sortOrder: 4 },

    // C++竞赛·综合训练
    { id: 'course-cpp-6b-01', gradeId: 'grade-cpp-6b', title: 'CSP-J真题精讲', description: '历年真题分析与解题', sortOrder: 0 },
    { id: 'course-cpp-6b-02', gradeId: 'grade-cpp-6b', title: '数据结构综合', description: '并查集与树状数组', sortOrder: 1 },
    { id: 'course-cpp-6b-03', gradeId: 'grade-cpp-6b', title: '数论基础', description: '质数筛法与快速幂', sortOrder: 2 },
    { id: 'course-cpp-6b-04', gradeId: 'grade-cpp-6b', title: '模拟与暴力', description: '题目理解与代码实现', sortOrder: 3 },
    { id: 'course-cpp-6b-05', gradeId: 'grade-cpp-6b', title: '考前冲刺训练', description: '综合模拟与查漏补缺', sortOrder: 4 },

    // Python启蒙·初识编程
    { id: 'course-py-3a-01', gradeId: 'grade-py-3a', title: '初识Python', description: '安装Python与第一个程序', sortOrder: 0 },
    { id: 'course-py-3a-02', gradeId: 'grade-py-3a', title: '变量与赋值', description: '变量的概念与命名规则', sortOrder: 1 },
    { id: 'course-py-3a-03', gradeId: 'grade-py-3a', title: '输入与输出', description: 'input()与print()函数', sortOrder: 2 },
    { id: 'course-py-3a-04', gradeId: 'grade-py-3a', title: '运算符与表达式', description: '算术、比较与逻辑运算', sortOrder: 3 },
    { id: 'course-py-3a-05', gradeId: 'grade-py-3a', title: 'turtle画图入门', description: '用turtle绘制简单图形', sortOrder: 4 },

    // Python启蒙·数据类型与运算
    { id: 'course-py-3b-01', gradeId: 'grade-py-3b', title: '数字类型', description: '整数、浮点数与类型转换', sortOrder: 0 },
    { id: 'course-py-3b-02', gradeId: 'grade-py-3b', title: '字符串基础', description: '字符串拼接与切片', sortOrder: 1 },
    { id: 'course-py-3b-03', gradeId: 'grade-py-3b', title: '布尔与比较', description: 'True/False与条件表达式', sortOrder: 2 },
    { id: 'course-py-3b-04', gradeId: 'grade-py-3b', title: '类型转换', description: 'str/int/float转换', sortOrder: 3 },
    { id: 'course-py-3b-05', gradeId: 'grade-py-3b', title: '综合小项目', description: '制作简易计算器', sortOrder: 4 },

    // Python基础·条件与循环
    { id: 'course-py-4a-01', gradeId: 'grade-py-4a', title: 'if条件语句', description: 'if-elif-else分支结构', sortOrder: 0 },
    { id: 'course-py-4a-02', gradeId: 'grade-py-4a', title: 'for循环', description: 'range()与遍历序列', sortOrder: 1 },
    { id: 'course-py-4a-03', gradeId: 'grade-py-4a', title: 'while循环', description: '条件循环与循环控制', sortOrder: 2 },
    { id: 'course-py-4a-04', gradeId: 'grade-py-4a', title: '嵌套循环', description: '双重循环与图案打印', sortOrder: 3 },
    { id: 'course-py-4a-05', gradeId: 'grade-py-4a', title: '猜数字游戏', description: '综合项目：随机数与循环', sortOrder: 4 },

    // Python基础·函数与模块
    { id: 'course-py-4b-01', gradeId: 'grade-py-4b', title: '函数定义与调用', description: '参数与返回值', sortOrder: 0 },
    { id: 'course-py-4b-02', gradeId: 'grade-py-4b', title: '模块与库', description: 'import与random/math库', sortOrder: 1 },
    { id: 'course-py-4b-03', gradeId: 'grade-py-4b', title: '作用域与递归', description: '局部变量与递归函数', sortOrder: 2 },
    { id: 'course-py-4b-04', gradeId: 'grade-py-4b', title: '常用内置函数', description: 'len/sorted/max/min等', sortOrder: 3 },
    { id: 'course-py-4b-05', gradeId: 'grade-py-4b', title: '绘图项目', description: '用turtle画复杂图案', sortOrder: 4 },

    // Python进阶·列表与字典
    { id: 'course-py-5a-01', gradeId: 'grade-py-5a', title: '列表基础', description: '创建、索引与切片', sortOrder: 0 },
    { id: 'course-py-5a-02', gradeId: 'grade-py-5a', title: '列表方法', description: 'append/remove/sort等', sortOrder: 1 },
    { id: 'course-py-5a-03', gradeId: 'grade-py-5a', title: '字典基础', description: '键值对与字典操作', sortOrder: 2 },
    { id: 'course-py-5a-04', gradeId: 'grade-py-5a', title: '列表推导式', description: '简洁的列表生成方式', sortOrder: 3 },
    { id: 'course-py-5a-05', gradeId: 'grade-py-5a', title: '数据统计项目', description: '用列表和字典统计成绩', sortOrder: 4 },

    // Python进阶·文件与异常处理
    { id: 'course-py-5b-01', gradeId: 'grade-py-5b', title: '文件读写', description: 'open/read/write操作', sortOrder: 0 },
    { id: 'course-py-5b-02', gradeId: 'grade-py-5b', title: 'CSV与JSON', description: '结构化数据处理', sortOrder: 1 },
    { id: 'course-py-5b-03', gradeId: 'grade-py-5b', title: '异常处理', description: 'try-except与错误类型', sortOrder: 2 },
    { id: 'course-py-5b-04', gradeId: 'grade-py-5b', title: '正则表达式入门', description: '字符串模式匹配', sortOrder: 3 },
    { id: 'course-py-5b-05', gradeId: 'grade-py-5b', title: '日志分析项目', description: '分析日志文件提取信息', sortOrder: 4 },

    // Python高级·面向对象编程
    { id: 'course-py-6a-01', gradeId: 'grade-py-6a', title: '类与对象', description: '面向对象思想与类定义', sortOrder: 0 },
    { id: 'course-py-6a-02', gradeId: 'grade-py-6a', title: '继承与多态', description: '子类与父类关系', sortOrder: 1 },
    { id: 'course-py-6a-03', gradeId: 'grade-py-6a', title: '封装与属性', description: '私有属性与property', sortOrder: 2 },
    { id: 'course-py-6a-04', gradeId: 'grade-py-6a', title: '魔法方法', description: '__init__/__str__/__repr__', sortOrder: 3 },
    { id: 'course-py-6a-05', gradeId: 'grade-py-6a', title: '小游戏项目', description: '用面向对象制作游戏', sortOrder: 4 },

    // Python高级·数据分析入门
    { id: 'course-py-6b-01', gradeId: 'grade-py-6b', title: 'NumPy基础', description: '数组操作与数学计算', sortOrder: 0 },
    { id: 'course-py-6b-02', gradeId: 'grade-py-6b', title: 'Matplotlib绘图', description: '折线图、柱状图与散点图', sortOrder: 1 },
    { id: 'course-py-6b-03', gradeId: 'grade-py-6b', title: 'Pandas入门', description: 'DataFrame与数据筛选', sortOrder: 2 },
    { id: 'course-py-6b-04', gradeId: 'grade-py-6b', title: '数据清洗', description: '缺失值与异常值处理', sortOrder: 3 },
    { id: 'course-py-6b-05', gradeId: 'grade-py-6b', title: '数据分析项目', description: '分析真实数据集并可视化', sortOrder: 4 },
  ],
};

export async function seedDatabase() {
  const db = getDb();

  // Seed subjects
  for (const subject of SEED_DATA.subjects) {
    await db.insert(subjects).values(subject).onConflictDoNothing();
  }

  // Seed textbooks
  for (const textbook of SEED_DATA.textbooks) {
    await db.insert(textbooks).values(textbook).onConflictDoNothing();
  }

  // Seed grades
  for (const grade of SEED_DATA.grades) {
    await db.insert(grades).values(grade).onConflictDoNothing();
  }

  // Seed courses
  for (const course of SEED_DATA.courses) {
    await db.insert(courses).values(course).onConflictDoNothing();
  }

  console.log('Database seeded successfully');
}

// Run on import in development
if (process.env.NODE_ENV !== 'test') {
  initDb().then(() => {
    seedDatabase().catch(console.error);
  }).catch(console.error);
}
