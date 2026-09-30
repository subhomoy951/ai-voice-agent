--
-- PostgreSQL database dump
--

\restrict dVhDCJ748wEoWQpgjbMah0uhwPYi9YDhkSrlEDws3arYAaT8AgYMBaywomflDa6

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.calls DROP CONSTRAINT IF EXISTS calls_lead_id_fkey;
ALTER TABLE IF EXISTS ONLY public.call_messages DROP CONSTRAINT IF EXISTS call_messages_call_id_fkey;
DROP INDEX IF EXISTS public.calls_lead_id_index;
DROP INDEX IF EXISTS public.call_messages_call_id_spoken_at_index;
ALTER TABLE IF EXISTS ONLY public.leads DROP CONSTRAINT IF EXISTS leads_pkey;
ALTER TABLE IF EXISTS ONLY public.calls DROP CONSTRAINT IF EXISTS calls_pkey;
ALTER TABLE IF EXISTS ONLY public.call_messages DROP CONSTRAINT IF EXISTS call_messages_pkey;
ALTER TABLE IF EXISTS public.leads ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.calls ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.call_messages ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.leads_id_seq;
DROP TABLE IF EXISTS public.leads;
DROP SEQUENCE IF EXISTS public.calls_id_seq;
DROP TABLE IF EXISTS public.calls;
DROP SEQUENCE IF EXISTS public.call_messages_id_seq;
DROP TABLE IF EXISTS public.call_messages;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: call_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_messages (
    id bigint NOT NULL,
    call_id bigint NOT NULL,
    speaker character varying(20) NOT NULL,
    message text NOT NULL,
    spoken_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT call_messages_speaker_check CHECK (((speaker)::text = ANY ((ARRAY['ai'::character varying, 'customer'::character varying, 'system'::character varying])::text[])))
);


--
-- Name: call_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.call_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: call_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.call_messages_id_seq OWNED BY public.call_messages.id;


--
-- Name: calls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calls (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    status character varying(20) DEFAULT 'queued'::character varying NOT NULL,
    outcome character varying(30),
    summary text,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT calls_status_check CHECK (((status)::text = ANY ((ARRAY['queued'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: calls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calls_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calls_id_seq OWNED BY public.calls.id;


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id bigint NOT NULL,
    name character varying(120) NOT NULL,
    phone character varying(30) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: leads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leads_id_seq OWNED BY public.leads.id;


--
-- Name: call_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_messages ALTER COLUMN id SET DEFAULT nextval('public.call_messages_id_seq'::regclass);


--
-- Name: calls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calls ALTER COLUMN id SET DEFAULT nextval('public.calls_id_seq'::regclass);


--
-- Name: leads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads ALTER COLUMN id SET DEFAULT nextval('public.leads_id_seq'::regclass);


--
-- Data for Name: call_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.call_messages (id, call_id, speaker, message, spoken_at) FROM stdin;
\.


--
-- Data for Name: calls; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.calls (id, lead_id, status, outcome, summary, started_at, ended_at, created_at) FROM stdin;
\.


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leads (id, name, phone, created_at) FROM stdin;
\.


--
-- Name: call_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.call_messages_id_seq', 1, false);


--
-- Name: calls_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.calls_id_seq', 1, false);


--
-- Name: leads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leads_id_seq', 1, false);


--
-- Name: call_messages call_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_messages
    ADD CONSTRAINT call_messages_pkey PRIMARY KEY (id);


--
-- Name: calls calls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: call_messages_call_id_spoken_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX call_messages_call_id_spoken_at_index ON public.call_messages USING btree (call_id, spoken_at);


--
-- Name: calls_lead_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calls_lead_id_index ON public.calls USING btree (lead_id);


--
-- Name: call_messages call_messages_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_messages
    ADD CONSTRAINT call_messages_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.calls(id) ON DELETE CASCADE;


--
-- Name: calls calls_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dVhDCJ748wEoWQpgjbMah0uhwPYi9YDhkSrlEDws3arYAaT8AgYMBaywomflDa6

