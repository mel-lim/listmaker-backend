-- Second part of migration - data for template list items
--
-- Data for Name: template_list; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.template_list (id, title, trip_category, trip_duration) FROM stdin;
1	Gear	ski tour	any
2	Clothing	ski tour	any
3	Food (Day Trip)	ski tour	day
4	Food (Overnight Trip)	ski tour	overnight
5	Camping	ski tour	overnight
7	Gear	hiking	any
8	Clothing	hiking	any
9	Camping	hiking	overnight
10	Food	hiking	day
11	Food	hiking	overnight
12	General outdoor gear	summer mountaineering	any
13	General mountaineering gear	summer mountaineering	any
14	Glacier-travel gear	summer mountaineering	any
15	Clothing	summer mountaineering	any
16	Food	summer mountaineering	day
17	Food	summer mountaineering	overnight
18	Camping	summer mountaineering	overnight
19	Glacier-Travel Gear	ski tour	any
\.


--
-- Data for Name: template_list_item; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.template_list_item (id, name, list_id) FROM stdin;
1	Skis/splitboard, poles, boots, skins	1
2	Transceiver, probe, shovel and spare batteries	1
3	Helmet, goggles, sunglasses	1
4	Whistle	1
5	Medical kit	1
6	Duct tape, zip ties, multitool, knife, ski straps	1
7	Headtorch, compass, lighter	1
8	Ski crampons	1
9	Puffy/down jacket	2
10	Shell jacket	2
11	Bibs/pants	2
12	Baselayer - top and bottom	2
13	Mid-layer(s)	2
14	Touring gloves, warm gloves, extra gloves or liners	2
15	Cap, buff, toque (beanie)	2
16	Socks and spare pair	2
17	1.5L water	3
18	Sandwich	3
19	Nuts	3
20	Clif bar	3
21	Apple	3
22	Thermos of tea	3
23	1.5L water/day	4
24	1x sandwich/day	4
25	1 x portion of nuts/day	4
26	1.5x clif bar/day	4
27	1x apple/2days	4
28	Thermos of tea	4
29	~500 calories of dehydrated meal/night	4
30	2/3 cups of oatmeal with added dried fruit, nuts and sugar/morning	4
31	Coffee and tea	4
32	Ample chocolate/treats	4
33	Tent	5
34	Sleeping bag	5
35	Sleeping mat	5
36	Headlamp	5
37	Nalgene bottle (for drinking and as sleeping bag warmer)	5
38	Additional water bottle or hydration bladder	5
39	Camping stove and fuel	5
40	Eating kit - bowl/tupperware, cup, fork/spoon	5
41	Knife/multitool	5
42	Rubbish bags	5
43	Toiletries - washcloth, toothbrush, toothpaste	5
44	First aid kit	5
45	Insect repellant and sunscreen	5
46	Poo kit - wag bag or trowel, toilet paper, toilet-paper-bag	5
47	Communication device (In-Reach, radio)	1
48	Battery pack and cable for devices	5
49	Emergency bivy	1
50	Underwear	2
51	Hiking boots	7
52	Hiking poles	7
54	Headlamp	7
55	First aid kit	7
56	Multitool including knife	7
57	Lighter or flint	7
58	Sun protection - hat, sunglasses, sunscreen and lipbalm	7
59	Insect protection - repellent and face net	7
60	Emergency bivy	7
61	Baselayers - top and bottom	8
62	Extra warm layer(s) - fleece / puffy jacket	8
63	Rain jacket and rainpants	8
64	Gaiters	8
65	Buff and beanie	8
66	Sock liners	8
67	Hiking socks	8
68	Underwear	8
69	Tent	9
70	Sleeping bag	9
71	Sleeping mat	9
73	Nalgene bottle (for drinking and as sleeping bag warmer)	9
74	Additional water bottle or hydration bladder	9
75	Camping stove and fuel	9
76	Eating kit - bowl/tupperware, cup, fork/spoon	9
77	Knife/multitool	9
78	Rubbish bags	9
79	Toiletries - washcloth, toothbrush, toothpaste	9
82	Poo kit - wag bag or trowel, toilet paper, toilet-paper-bag	9
83	Battery pack and cable for devices	9
84	Water purification system - filter or tablets	9
85	1.5L water	10
86	Sandwich	10
87	Nuts	10
88	Clif bar	10
89	Apple	10
90	Thermos of tea	10
91	1.5L water/day	11
92	1x sandwich/day	11
93	1 x portion of nuts/day	11
94	1.5x clif bar/day	11
95	1x apple/2days	11
96	Thermos of tea	11
97	~500 calories of dehydrated meal/night	11
98	2/3 cups of oatmeal with added dried fruit, nuts and sugar/morning	11
99	Coffee and tea	11
100	Ample chocolate/treats	11
101	Bear cache hanging cord	9
102	Dry bags for storing food and gear	9
103	Backpack rain cover	7
53	Navigation device (phone or compass and map)	7
105	Hiking poles	12
106	Headlamp	12
107	First aid kit	12
108	Multitool including knife	12
109	Lighter or flint	12
110	Sun protection - hat, sunglasses, sunscreen and lipbalm	12
111	Insect protection - repellent and face net	12
112	Emergency bivy	12
113	Backpack rain cover	12
114	Navigation device (phone or compass and map)	12
115	Mountaineering boots	13
116	Helmet	13
117	Crampons	13
118	Alpine pack	13
119	Ice axe	13
120	Glacier rope	14
121	Harness	14
122	Belay device	14
123	Snow picket, fluke or ice screw	14
124	3 prussiks	14
125	4 locking biners	14
126	4 non-locking biners	14
127	Belay device	14
128	5-6m cordelette	14
129	Double sling	14
130	Single sling	14
131	Hardshell jacket	15
132	Softshell jacket	15
133	Fleece	15
134	Merino base layer top	15
135	Softshell/thermal leggings	15
136	Waterproof pants / rainpants	15
137	Light t-shirt and pants / leggings	15
138	Gaiters	15
139	Sock liners	15
140	Warm socks	15
141	Hiking socks	15
142	Undies	15
143	Glove liners	15
144	Warm gloves	15
145	Buff and beanie	15
146	1.5L water	16
147	Sandwich	16
148	Nuts	16
149	Clif bar	16
150	Apple	16
151	Thermos of tea	16
152	1.5L water/day	17
153	1x sandwich/day	17
154	1 x portion of nuts/day	17
155	1.5x clif bar/day	17
156	1x apple/2days	17
157	Thermos of tea	17
158	~500 calories of dehydrated meal/night	17
159	2/3 cups of oatmeal with added dried fruit, nuts and sugar/morning	17
160	Coffee and tea	17
161	Ample chocolate/treats	17
162	Tent	18
163	Sleeping bag	18
164	Sleeping mat	18
165	Nalgene bottle (for drinking and as sleeping bag warmer)	18
166	Additional water bottle or hydration bladder	18
167	Camping stove and fuel	18
168	Eating kit - bowl/tupperware, cup, fork/spoon	18
169	Knife/multitool	18
170	Rubbish bags	18
171	Toiletries - washcloth, toothbrush, toothpaste	18
172	Poo kit - wag bag or trowel, toilet paper, toilet-paper-bag	18
173	Battery pack and cable for devices	18
174	Water purification system - filter or tablets	18
175	Bear cache hanging cord	18
176	Dry bags for storing food and gear	18
177	Glacier rope	19
178	Harness	19
179	Belay device	19
180	Snow picket, fluke or ice screw	19
181	3 prussiks	19
182	4 locking biners	19
183	4 non-locking biners	19
184	Belay device	19
185	5-6m cordelette	19
186	Double sling	19
187	Single sling	19
\.