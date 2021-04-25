--
-- Empty tables for initial migration
--

-- Dumped from database version 13.2
-- Dumped by pg_dump version 13.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_user (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    hashed_password character varying(1024),
    date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    date_modified timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: app_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_user_id_seq OWNED BY public.app_user.id;


--
-- Name: app_users_trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_users_trips (
    app_user_id integer NOT NULL,
    trip_id integer NOT NULL
);


--
-- Name: list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.list (
    id integer NOT NULL,
    title character varying(50) NOT NULL,
    app_user_id integer,
    trip_id integer
);


--
-- Name: list_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.list_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: list_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.list_id_seq OWNED BY public.list.id;


--
-- Name: list_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.list_item (
    id integer NOT NULL,
    name text NOT NULL,
    list_id integer,
    is_checked boolean DEFAULT false
);


--
-- Name: list_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.list_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: list_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.list_item_id_seq OWNED BY public.list_item.id;


--
-- Name: template_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_list (
    id integer NOT NULL,
    title character varying(50),
    trip_category character varying(50),
    trip_duration character varying(50)
);


--
-- Name: template_list_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.template_list_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: template_list_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.template_list_id_seq OWNED BY public.template_list.id;


--
-- Name: template_list_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_list_item (
    id integer NOT NULL,
    name character varying(500),
    list_id integer
);


--
-- Name: template_list_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.template_list_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: template_list_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.template_list_item_id_seq OWNED BY public.template_list_item.id;


--
-- Name: trip; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trip (
    id integer NOT NULL,
    name character varying(50),
    category character varying(50) NOT NULL,
    description text,
    duration character varying(50) DEFAULT 'day'::character varying NOT NULL
);


--
-- Name: trip_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trip_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trip_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trip_id_seq OWNED BY public.trip.id;


--
-- Name: app_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user ALTER COLUMN id SET DEFAULT nextval('public.app_user_id_seq'::regclass);


--
-- Name: list id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.list ALTER COLUMN id SET DEFAULT nextval('public.list_id_seq'::regclass);


--
-- Name: list_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.list_item ALTER COLUMN id SET DEFAULT nextval('public.list_item_id_seq'::regclass);


--
-- Name: template_list id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_list ALTER COLUMN id SET DEFAULT nextval('public.template_list_id_seq'::regclass);


--
-- Name: template_list_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_list_item ALTER COLUMN id SET DEFAULT nextval('public.template_list_item_id_seq'::regclass);


--
-- Name: trip id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip ALTER COLUMN id SET DEFAULT nextval('public.trip_id_seq'::regclass);


--
-- Name: app_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.app_user_id_seq', 113, true);



--
-- Name: list_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.list_id_seq', 383, true);


--
-- Name: list_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.list_item_id_seq', 2556, true);


--
-- Name: template_list_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.template_list_id_seq', 19, true);


--
-- Name: template_list_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.template_list_item_id_seq', 187, true);


--
-- Name: trip_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.trip_id_seq', 99, true);


--
-- Name: app_user app_user_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_email_key UNIQUE (email);


--
-- Name: app_user app_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (id);


--
-- Name: app_user app_user_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_username_key UNIQUE (username);


--
-- Name: app_users_trips app_users_trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users_trips
    ADD CONSTRAINT app_users_trips_pkey PRIMARY KEY (app_user_id, trip_id);




--
-- Name: list_item list_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.list_item
    ADD CONSTRAINT list_item_pkey PRIMARY KEY (id);


--
-- Name: list list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.list
    ADD CONSTRAINT list_pkey PRIMARY KEY (id);


--
-- Name: template_list_item template_list_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_list_item
    ADD CONSTRAINT template_list_item_pkey PRIMARY KEY (id);


--
-- Name: template_list template_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_list
    ADD CONSTRAINT template_list_pkey PRIMARY KEY (id);


--
-- Name: trip trip_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip
    ADD CONSTRAINT trip_pkey PRIMARY KEY (id);


--
-- Name: app_users_trips app_users_trips_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users_trips
    ADD CONSTRAINT app_users_trips_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trip(id);


--
-- Name: app_users_trips app_users_trips_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users_trips
    ADD CONSTRAINT app_users_trips_user_id_fkey FOREIGN KEY (app_user_id) REFERENCES public.app_user(id);


--
-- Name: template_list_item fk_template_list; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_list_item
    ADD CONSTRAINT fk_template_list FOREIGN KEY (list_id) REFERENCES public.template_list(id);


--
-- Name: list list_app_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.list
    ADD CONSTRAINT list_app_user_id_fkey FOREIGN KEY (app_user_id) REFERENCES public.app_user(id);


--
-- Name: list_item list_item_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.list_item
    ADD CONSTRAINT list_item_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.list(id);


--
-- Name: list list_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.list
    ADD CONSTRAINT list_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trip(id);




--
-- Name: TABLE template_list; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.template_list TO me;


--
-- Name: SEQUENCE template_list_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.template_list_id_seq TO me;


--
-- Name: TABLE template_list_item; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.template_list_item TO me;


--
-- Name: SEQUENCE template_list_item_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,USAGE ON SEQUENCE public.template_list_item_id_seq TO me;


--
-- PostgreSQL database dump complete
--

