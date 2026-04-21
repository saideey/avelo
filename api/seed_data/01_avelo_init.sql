--
-- PostgreSQL database dump
--

-- restrict directive removed for compatibility with older psql clients

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

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

--
-- Name: auditaction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.auditaction AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'BLOCK',
    'UNBLOCK',
    'VERIFY',
    'APPROVE',
    'REJECT',
    'LOGIN',
    'LOGOUT',
    'SETTINGS_CHANGE',
    'REFUND',
    'REVIEW_DELETE',
    'COMPLAINT_RESOLVE'
);


--
-- Name: bonustier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bonustier AS ENUM (
    'STANDART',
    'SILVER',
    'GOLD',
    'PLATINUM'
);


--
-- Name: bookingstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bookingstatus AS ENUM (
    'PENDING',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
);


--
-- Name: cashbacktier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cashbacktier AS ENUM (
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM'
);


--
-- Name: cashbacktransactiontype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cashbacktransactiontype AS ENUM (
    'EARNED',
    'SPENT',
    'EXPIRED',
    'TRANSFERRED'
);


--
-- Name: complaintstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.complaintstatus AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED',
    'ESCALATED'
);


--
-- Name: complainttype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.complainttype AS ENUM (
    'SERVICE_QUALITY',
    'PAYMENT_ISSUE',
    'WARRANTY_ISSUE',
    'FRAUD',
    'RUDE_BEHAVIOR',
    'FAKE_REVIEW',
    'PRICE_DISPUTE',
    'OTHER'
);


--
-- Name: escrowstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.escrowstatus AS ENUM (
    'HELD',
    'RELEASED',
    'REFUNDED'
);


--
-- Name: otppurpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.otppurpose AS ENUM (
    'LOGIN',
    'REGISTER',
    'RESET'
);


--
-- Name: partorderstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.partorderstatus AS ENUM (
    'PENDING',
    'ADMIN_REVIEWED',
    'PARTNER_CONFIRMED',
    'SHIPPED',
    'PARTNER_RECEIVED',
    'DELIVERED',
    'CANCELLED'
);


--
-- Name: paymentmethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.paymentmethod AS ENUM (
    'CASH',
    'CARD',
    'CLICK',
    'PAYME',
    'UZUM'
);


--
-- Name: paymentstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.paymentstatus AS ENUM (
    'PENDING',
    'PROCESSING',
    'SUCCESS',
    'FAILED',
    'REFUNDED'
);


--
-- Name: subscriptiontier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscriptiontier AS ENUM (
    'BASIC',
    'SILVER',
    'GOLD',
    'PLATINUM'
);


--
-- Name: userrole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.userrole AS ENUM (
    'CUSTOMER',
    'PARTNER',
    'MECHANIC',
    'ADMIN',
    'SUPER_ADMIN',
    'REGIONAL_ADMIN',
    'MODERATOR'
);


--
-- Name: warrantyclaimstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.warrantyclaimstatus AS ENUM (
    'SUBMITTED',
    'REVIEWING',
    'APPROVED',
    'REJECTED',
    'RESOLVED'
);


--
-- Name: warrantystatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.warrantystatus AS ENUM (
    'ACTIVE',
    'CLAIMED',
    'EXPIRED',
    'VOID'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    admin_id uuid NOT NULL,
    action public.auditaction NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_id character varying(100),
    description text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    ip_address character varying(50),
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: booking_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_services (
    booking_id uuid NOT NULL,
    service_id uuid NOT NULL
);


--
-- Name: booking_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_status_history (
    booking_id uuid NOT NULL,
    old_status character varying(50),
    new_status character varying(50) NOT NULL,
    changed_by uuid,
    note text,
    "timestamp" timestamp with time zone NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    customer_id uuid NOT NULL,
    workshop_id uuid NOT NULL,
    vehicle_id uuid,
    scheduled_at timestamp with time zone NOT NULL,
    status public.bookingstatus NOT NULL,
    total_price numeric(12,2),
    notes text,
    mechanic_notes text,
    is_mobile boolean NOT NULL,
    address character varying(500),
    latitude double precision,
    longitude double precision,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: cashback_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cashback_transactions (
    wallet_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    type public.cashbacktransactiontype NOT NULL,
    source character varying(255),
    reference_id uuid,
    expires_at timestamp with time zone,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: cashback_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cashback_wallets (
    user_id uuid NOT NULL,
    balance numeric(12,2) NOT NULL,
    tier public.cashbacktier NOT NULL,
    total_earned numeric(12,2) NOT NULL,
    total_spent numeric(12,2) NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: complaints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.complaints (
    complainant_id uuid NOT NULL,
    against_id uuid,
    workshop_id uuid,
    booking_id uuid,
    type public.complainttype NOT NULL,
    status public.complaintstatus NOT NULL,
    subject character varying(255) NOT NULL,
    description text NOT NULL,
    resolution text,
    assigned_to uuid,
    resolved_at timestamp with time zone,
    priority integer NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: escrows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escrows (
    payment_id uuid NOT NULL,
    workshop_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    status public.escrowstatus NOT NULL,
    released_at timestamp with time zone,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: favorite_workshops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorite_workshops (
    user_id uuid NOT NULL,
    workshop_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    type character varying(100) NOT NULL,
    data jsonb,
    is_read boolean NOT NULL,
    sent_via character varying(50) NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: otp_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_codes (
    user_phone character varying(20) NOT NULL,
    code character varying(10) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_used boolean NOT NULL,
    purpose public.otppurpose NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: part_bonus_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.part_bonus_transactions (
    wallet_id uuid NOT NULL,
    part_order_id uuid,
    amount numeric(12,2) NOT NULL,
    type character varying(20) NOT NULL,
    tier_at_time character varying(20) NOT NULL,
    note text,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: part_bonus_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.part_bonus_wallets (
    partner_id uuid NOT NULL,
    balance numeric(12,2) NOT NULL,
    total_earned numeric(12,2) NOT NULL,
    total_withdrawn numeric(12,2) NOT NULL,
    tier public.bonustier NOT NULL,
    monthly_spent numeric(12,2) NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: part_brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.part_brands (
    name character varying(200) NOT NULL,
    country character varying(100),
    logo_url character varying(500),
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: part_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.part_categories (
    name character varying(200) NOT NULL,
    slug character varying(200) NOT NULL,
    parent_id uuid,
    icon_url character varying(500),
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: part_inventories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.part_inventories (
    part_id uuid NOT NULL,
    quantity_available integer NOT NULL,
    quantity_reserved integer NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: part_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.part_order_items (
    order_id uuid NOT NULL,
    part_id uuid NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    is_available boolean NOT NULL,
    admin_note character varying(255),
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: part_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.part_orders (
    workshop_id uuid,
    customer_id uuid,
    booking_id uuid,
    status public.partorderstatus NOT NULL,
    delivery_address text NOT NULL,
    delivery_fee numeric(12,2) NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: part_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.part_prices (
    part_id uuid NOT NULL,
    price_retail numeric(12,2) NOT NULL,
    price_wholesale numeric(12,2),
    valid_from timestamp with time zone NOT NULL,
    valid_to timestamp with time zone,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: part_vehicle_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.part_vehicle_models (
    part_id uuid NOT NULL,
    vehicle_model_id uuid NOT NULL
);


--
-- Name: parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parts (
    sku character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    category_id uuid NOT NULL,
    brand_id uuid NOT NULL,
    description text,
    specifications jsonb,
    compatible_vehicles jsonb,
    images character varying[],
    weight_kg double precision,
    is_active boolean NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    booking_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    method public.paymentmethod NOT NULL,
    status public.paymentstatus NOT NULL,
    gateway_txn_id character varying(255),
    gateway_response jsonb,
    paid_at timestamp with time zone,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payouts (
    workshop_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    status character varying(50) NOT NULL,
    bank_account character varying(255),
    processed_at timestamp with time zone,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_settings (
    key character varying(100) NOT NULL,
    value text NOT NULL,
    description character varying(255),
    category character varying(50) NOT NULL,
    updated_by uuid,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    user_id uuid NOT NULL,
    token_hash character varying(500) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    device_info character varying(500),
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    booking_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    workshop_id uuid NOT NULL,
    rating_quality integer NOT NULL,
    rating_price integer NOT NULL,
    rating_time integer NOT NULL,
    rating_communication integer NOT NULL,
    rating_overall double precision NOT NULL,
    comment text,
    photos character varying[],
    reply text,
    is_visible boolean NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: service_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_categories (
    name character varying(200) NOT NULL,
    slug character varying(200) NOT NULL,
    icon_url character varying(500),
    parent_id uuid,
    "order" integer NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: service_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_tags (
    name character varying(100) NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    tier character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    price_monthly numeric(12,2) NOT NULL,
    features jsonb,
    max_bookings_per_month integer NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: time_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_slots (
    workshop_id uuid NOT NULL,
    date date NOT NULL,
    "time" time without time zone NOT NULL,
    capacity integer NOT NULL,
    booked_count integer NOT NULL,
    is_available boolean NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: user_vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_vehicles (
    user_id uuid NOT NULL,
    brand_id uuid NOT NULL,
    model_id uuid NOT NULL,
    year integer,
    license_plate character varying(20),
    vin_code character varying(17),
    color character varying(50),
    mileage integer,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    phone character varying(20) NOT NULL,
    email character varying(255),
    full_name character varying(255),
    role public.userrole NOT NULL,
    is_active boolean NOT NULL,
    is_verified boolean NOT NULL,
    avatar_url character varying(500),
    region character varying(100),
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: vehicle_brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_brands (
    name character varying(100) NOT NULL,
    logo_url character varying(500),
    country character varying(100),
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: vehicle_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_models (
    brand_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    year_from integer,
    year_to integer,
    image_url character varying(500),
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: warranties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warranties (
    booking_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    workshop_id uuid NOT NULL,
    duration_months integer NOT NULL,
    mileage_km integer,
    expires_at timestamp with time zone NOT NULL,
    status public.warrantystatus NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: warranty_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warranty_claims (
    warranty_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    description text NOT NULL,
    photos character varying[],
    status public.warrantyclaimstatus NOT NULL,
    admin_notes text,
    resolved_at timestamp with time zone,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: workshop_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workshop_certificates (
    workshop_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    issued_by character varying(255),
    issue_date date,
    image_url character varying(500),
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: workshop_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workshop_photos (
    workshop_id uuid NOT NULL,
    url character varying(500) NOT NULL,
    "order" integer NOT NULL,
    is_main boolean NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: workshop_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workshop_schedules (
    workshop_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    open_time time without time zone,
    close_time time without time zone,
    is_closed boolean NOT NULL,
    slot_duration_minutes integer NOT NULL,
    max_concurrent_bookings integer NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: workshop_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workshop_services (
    workshop_id uuid NOT NULL,
    category_id uuid,
    name character varying(255) NOT NULL,
    price_from numeric(12,2),
    price_to numeric(12,2),
    duration_minutes integer,
    is_available boolean NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: workshop_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workshop_subscriptions (
    workshop_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_active boolean NOT NULL,
    auto_renew boolean NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Name: workshops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workshops (
    partner_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    address character varying(500),
    city character varying(100),
    district character varying(100),
    latitude double precision,
    longitude double precision,
    phone character varying(20),
    working_hours jsonb,
    is_verified boolean NOT NULL,
    is_active boolean NOT NULL,
    subscription_tier public.subscriptiontier NOT NULL,
    rating_avg double precision NOT NULL,
    total_reviews integer NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    is_deleted boolean NOT NULL
);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (admin_id, action, resource_type, resource_id, description, old_value, new_value, ip_address, id, created_at, updated_at, is_deleted) FROM stdin;
6d6c1e4a-f037-4866-97aa-8fbd9142b835	CREATE	user	537a22f4	Yangi foydalanuvchi yaratildi	\N	\N	192.168.1.1	9df91e67-7ab5-4c50-b61e-f046117176f9	2026-04-19 11:38:27.69316+00	2026-04-19 11:38:27.693163+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	VERIFY	workshop	30d2b453	Ustaxona tasdiqlandi: Premium Avto	\N	\N	192.168.1.1	dc642be1-e22b-41a5-8284-d0b229301060	2026-04-19 11:38:27.693164+00	2026-04-19 11:38:27.693164+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	BLOCK	user	a184d925	Foydalanuvchi bloklandi	\N	\N	192.168.1.1	499b6ed5-330c-43b0-9260-7d34c45fa946	2026-04-19 11:38:27.693165+00	2026-04-19 11:38:27.693165+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	APPROVE	warranty_claim	be028ec0	Kafolat talabi tasdiqlandi	\N	\N	192.168.1.1	fb93ef76-2599-4b39-b79e-d5818b6e8827	2026-04-19 11:38:27.693165+00	2026-04-19 11:38:27.693165+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	SETTINGS_CHANGE	settings	c19cd780	Komissiya 10% ga o'zgartirildi	\N	\N	192.168.1.1	f8bb1edc-646e-490d-b4eb-cadf67d250be	2026-04-19 11:38:27.693166+00	2026-04-19 11:38:27.693166+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	REVIEW_DELETE	review	694714c9	Soxta sharh o'chirildi	\N	\N	192.168.1.1	7c045093-7cde-4727-9e4a-83fc1fed85c2	2026-04-19 11:38:27.693166+00	2026-04-19 11:38:27.693166+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	CREATE	admin	257c58c4	Yangi moderator yaratildi	\N	\N	192.168.1.1	4745c168-d676-4f3f-b4c2-2ddf0d58754b	2026-04-19 11:38:27.693167+00	2026-04-19 11:38:27.693167+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	UPDATE	workshop	ed743c36	Ustaxona manzili yangilandi	\N	\N	192.168.1.1	fe0aa3d3-d1c1-496d-9b5e-011aae2bbae4	2026-04-19 11:38:27.693167+00	2026-04-19 11:38:27.693167+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	CREATE	workshop	1a4a292d	Yangi ustaxona yaratildi	\N	\N	192.168.1.1	2f1a3943-1bec-4c95-92bc-c8f2f619bc5c	2026-04-19 11:38:27.693168+00	2026-04-19 11:38:27.693168+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	COMPLAINT_RESOLVE	complaint	c1157726	Shikoyat hal qilindi	\N	\N	192.168.1.1	a7da1fb5-865f-407c-9fac-b801d9e68d8a	2026-04-19 11:38:27.693168+00	2026-04-19 11:38:27.693168+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	UPDATE	complaint	f1e54cb3-abe2-4723-8f54-81b806766d4a	Shikoyat tayinlandi: Xorazm Admin	{"assigned_to": null}	{"assigned_to": "711f4c35-ccef-4b22-9be0-a0588e21e08b"}	172.31.0.4	bb826487-8f9e-46f3-a10b-43dba05c8d74	2026-04-20 07:04:16.990342+00	2026-04-20 07:04:16.990344+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	CREATE	workshop	c27697c9-9ac9-4e9f-8e3b-5c2519f8983c	Ustaxona yaratildi: Urganch avto	null	null	\N	f9685c5f-2b54-4edc-a05d-01e4e74c5bea	2026-04-21 07:03:34.6055+00	2026-04-21 07:03:34.605502+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	COMPLAINT_RESOLVE	complaint	f1e54cb3-abe2-4723-8f54-81b806766d4a	Shikoyat hal qilindi: masala yechildi	{"status": "in_progress"}	{"status": "resolved", "resolution": "masala yechildi"}	172.31.0.4	41462b6d-7aa4-4421-a236-9c0c478e0099	2026-04-21 07:06:55.986183+00	2026-04-21 07:06:55.986184+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	UPDATE	part_order	d36577b8-ef95-4d28-b9da-48718a33ece5	Buyurtma ko'rib chiqildi va ustaga yuborildi	null	null	172.31.0.4	004e2a2f-1e0f-4677-872d-a98d80b300f1	2026-04-21 07:12:30.163553+00	2026-04-21 07:12:30.163554+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	UPDATE	part_order	d36577b8-ef95-4d28-b9da-48718a33ece5	Status: partner_confirmed → shipped	null	null	172.31.0.4	1a9cf261-6298-42c3-8bf8-842fe04c9421	2026-04-21 07:13:29.718501+00	2026-04-21 07:13:29.718502+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	CREATE	workshop	02ed243f-ad3a-4355-95f0-f04b6f28a7c4	Ustaxona yaratildi: URGANCH DARITAL	null	null	\N	2a06d3fe-2886-476d-8478-be8a9f95c601	2026-04-21 07:18:47.16474+00	2026-04-21 07:18:47.164742+00	f
\.


--
-- Data for Name: booking_services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.booking_services (booking_id, service_id) FROM stdin;
f55bf36d-ad20-4061-9e68-59aa4bf47082	a0c0f3eb-7367-4557-ba5e-be1fb54f2557
f55bf36d-ad20-4061-9e68-59aa4bf47082	83711ccf-60ba-43f1-b5fe-880b8d480c25
f55bf36d-ad20-4061-9e68-59aa4bf47082	61d554fb-cae5-416c-9956-d5bcca908410
d64dff8b-e8c3-4d36-948a-e65b71b5ec4a	8a9392d7-3f52-4424-a590-30ffe873ad47
d64dff8b-e8c3-4d36-948a-e65b71b5ec4a	cde94801-12cc-4f90-b353-e9115c26070e
20a01cdf-a1b2-4fb8-ba6a-93c504ec41cf	24a60283-4723-4c48-b7cf-d23e97487c1c
\.


--
-- Data for Name: booking_status_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.booking_status_history (booking_id, old_status, new_status, changed_by, note, "timestamp", id, created_at, updated_at, is_deleted) FROM stdin;
f55bf36d-ad20-4061-9e68-59aa4bf47082	\N	pending	a82e28be-46c0-40e1-995d-bee60803d783	\N	2026-04-20 12:01:31.486415+00	3cf94dd1-ccb1-442e-a78e-c81148bd2164	2026-04-20 12:01:31.488481+00	2026-04-20 12:01:31.488483+00	f
d64dff8b-e8c3-4d36-948a-e65b71b5ec4a	\N	pending	a82e28be-46c0-40e1-995d-bee60803d783	\N	2026-04-21 06:52:59.050892+00	52e464bd-b589-4805-a68f-92ab91b22561	2026-04-21 06:52:59.052114+00	2026-04-21 06:52:59.052116+00	f
20a01cdf-a1b2-4fb8-ba6a-93c504ec41cf	\N	pending	a82e28be-46c0-40e1-995d-bee60803d783	\N	2026-04-21 06:53:20.447416+00	09143e04-af8c-4b27-8e18-500e3067b07e	2026-04-21 06:53:20.448746+00	2026-04-21 06:53:20.448748+00	f
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bookings (customer_id, workshop_id, vehicle_id, scheduled_at, status, total_price, notes, mechanic_notes, is_mobile, address, latitude, longitude, id, created_at, updated_at, is_deleted) FROM stdin;
49354f6b-ef90-4176-897d-ceaf428d76f2	f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	\N	2026-04-07 04:38:27.127919+00	COMPLETED	150000.00	Tormoz tekshirish	\N	f	\N	\N	\N	83d15dea-7774-4ad2-8211-f4d8fd59a644	2026-04-19 11:38:27.470201+00	2026-04-19 11:38:27.470202+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	\N	2026-03-25 03:38:27.127919+00	COMPLETED	80000.00	Dvigatel shovqin qiladi	\N	f	\N	\N	\N	76a39bdf-8d33-400d-b131-a81b3becaa58	2026-04-19 11:38:27.470203+00	2026-04-19 11:38:27.470203+00	f
49354f6b-ef90-4176-897d-ceaf428d76f2	a0cc3386-af63-4387-b8ad-7686da70cd9e	\N	2026-03-07 10:38:27.127919+00	COMPLETED	450000.00	Tormoz tekshirish	\N	f	\N	\N	\N	bfb3a97f-8ca1-4f45-9882-d80e777ac2bc	2026-04-19 11:38:27.470204+00	2026-04-19 11:38:27.470204+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	\N	2026-04-06 05:38:27.127919+00	COMPLETED	250000.00	Shina almashtirish	\N	f	\N	\N	\N	76aeebf9-a491-4509-af05-3980271f4aa4	2026-04-19 11:38:27.470204+00	2026-04-19 11:38:27.470204+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	b7baeea9-fc4d-4cf9-a469-4916155f40bc	\N	2026-03-23 03:38:27.127919+00	COMPLETED	450000.00	Diagnostika	\N	f	\N	\N	\N	b51bc8dc-a8e1-43f3-82a0-86943ef346e4	2026-04-19 11:38:27.470205+00	2026-04-19 11:38:27.470205+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	\N	2026-04-17 05:38:27.127919+00	COMPLETED	150000.00	Diagnostika	\N	f	\N	\N	\N	0aa55171-30b2-4255-a398-276d90e09ba4	2026-04-19 11:38:27.470205+00	2026-04-19 11:38:27.470206+00	f
a82e28be-46c0-40e1-995d-bee60803d783	b7baeea9-fc4d-4cf9-a469-4916155f40bc	\N	2026-03-10 09:38:27.127919+00	COMPLETED	120000.00	Diagnostika	\N	f	\N	\N	\N	d25d3a36-8222-47f7-8496-e62b206c61bc	2026-04-19 11:38:27.470206+00	2026-04-19 11:38:27.470206+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	a0cc3386-af63-4387-b8ad-7686da70cd9e	\N	2026-03-13 05:38:27.127919+00	COMPLETED	250000.00	Moy almashtirish kerak	\N	f	\N	\N	\N	bd1d318e-34ba-4277-9116-e12470d6d33d	2026-04-19 11:38:27.470207+00	2026-04-19 11:38:27.470207+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	d0157137-b945-482c-aad0-f5b7f57044af	\N	2026-03-20 09:38:27.127919+00	COMPLETED	150000.00	Tormoz tekshirish	\N	f	\N	\N	\N	77762477-8d83-4192-99b0-07c95c806665	2026-04-19 11:38:27.470207+00	2026-04-19 11:38:27.470207+00	f
a82e28be-46c0-40e1-995d-bee60803d783	42a94963-592f-48d2-8bde-83ce8a2d786f	\N	2026-04-21 10:38:27.127919+00	COMPLETED	150000.00	\N	\N	f	\N	\N	\N	1668183e-244f-4987-9d9b-5b995c2b78fa	2026-04-19 11:38:27.470208+00	2026-04-19 11:38:27.470208+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	\N	2026-03-24 05:38:27.127919+00	COMPLETED	150000.00	\N	\N	f	\N	\N	\N	a068b534-7b60-4c4d-9d4d-3023c11ea78b	2026-04-19 11:38:27.470208+00	2026-04-19 11:38:27.470208+00	f
49354f6b-ef90-4176-897d-ceaf428d76f2	ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	\N	2026-03-24 06:38:27.127919+00	COMPLETED	80000.00	Tormoz tekshirish	\N	f	\N	\N	\N	757f6ae4-4f5c-4e42-85e5-bea976e3e300	2026-04-19 11:38:27.470209+00	2026-04-19 11:38:27.470209+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	\N	2026-03-10 03:38:27.127919+00	CONFIRMED	150000.00	Dvigatel shovqin qiladi	\N	f	\N	\N	\N	0c76a3d3-f303-4d08-819a-cf38b2d988fe	2026-04-19 11:38:27.470209+00	2026-04-19 11:38:27.47021+00	f
49354f6b-ef90-4176-897d-ceaf428d76f2	ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	\N	2026-04-20 03:38:27.127919+00	CONFIRMED	120000.00	Moy almashtirish kerak	\N	f	\N	\N	\N	171e4130-e8f5-4dfa-a98a-82f4a6c26916	2026-04-19 11:38:27.47021+00	2026-04-19 11:38:27.47021+00	f
a82e28be-46c0-40e1-995d-bee60803d783	f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	\N	2026-04-19 07:38:27.127919+00	CONFIRMED	250000.00	Tormoz tekshirish	\N	f	\N	\N	\N	3b56f05c-0d0c-414f-8dc2-98285b1b67eb	2026-04-19 11:38:27.47021+00	2026-04-19 11:38:27.470211+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	\N	2026-04-06 08:38:27.127919+00	CONFIRMED	450000.00	Tormoz tekshirish	\N	f	\N	\N	\N	f3f4321a-151e-4ff7-8be8-59539003b4f9	2026-04-19 11:38:27.470211+00	2026-04-19 11:38:27.470211+00	f
a82e28be-46c0-40e1-995d-bee60803d783	b7baeea9-fc4d-4cf9-a469-4916155f40bc	\N	2026-04-21 11:38:27.127919+00	CONFIRMED	120000.00	\N	\N	f	\N	\N	\N	3a4f03eb-ea02-4eaf-9bcb-cbe518a2c6b1	2026-04-19 11:38:27.470212+00	2026-04-19 11:38:27.470212+00	f
49354f6b-ef90-4176-897d-ceaf428d76f2	5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	\N	2026-03-23 07:38:27.127919+00	CONFIRMED	250000.00	Diagnostika	\N	f	\N	\N	\N	42a4e386-4361-41d8-a649-9ebea3fe3cfd	2026-04-19 11:38:27.470212+00	2026-04-19 11:38:27.470212+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	b7baeea9-fc4d-4cf9-a469-4916155f40bc	\N	2026-03-31 10:38:27.127919+00	PENDING	120000.00	Moy almashtirish kerak	\N	f	\N	\N	\N	7edb716b-3acb-4fd8-bb18-014036a383f2	2026-04-19 11:38:27.470213+00	2026-04-19 11:38:27.470213+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	d0157137-b945-482c-aad0-f5b7f57044af	\N	2026-03-31 10:38:27.127919+00	PENDING	120000.00	Shina almashtirish	\N	f	\N	\N	\N	2ea9d51a-f6f9-4286-bb81-5eb8dbae67df	2026-04-19 11:38:27.470213+00	2026-04-19 11:38:27.470214+00	f
49354f6b-ef90-4176-897d-ceaf428d76f2	d0157137-b945-482c-aad0-f5b7f57044af	\N	2026-04-13 07:38:27.127919+00	PENDING	150000.00	Dvigatel shovqin qiladi	\N	f	\N	\N	\N	601919a0-829d-4bf9-a899-1d9a28292a7c	2026-04-19 11:38:27.470214+00	2026-04-19 11:38:27.470214+00	f
a82e28be-46c0-40e1-995d-bee60803d783	b7baeea9-fc4d-4cf9-a469-4916155f40bc	\N	2026-04-18 06:38:27.127919+00	PENDING	200000.00	Tormoz tekshirish	\N	f	\N	\N	\N	8272df4b-14e9-4e8b-8604-0d522faef8ea	2026-04-19 11:38:27.470214+00	2026-04-19 11:38:27.470215+00	f
a82e28be-46c0-40e1-995d-bee60803d783	b7baeea9-fc4d-4cf9-a469-4916155f40bc	\N	2026-04-12 07:38:27.127919+00	PENDING	250000.00	Shina almashtirish	\N	f	\N	\N	\N	ce648aaa-e6d1-4b4a-9697-d6a2c228375d	2026-04-19 11:38:27.470215+00	2026-04-19 11:38:27.470215+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	42a94963-592f-48d2-8bde-83ce8a2d786f	\N	2026-03-25 10:38:27.127919+00	IN_PROGRESS	120000.00	Tormoz tekshirish	\N	f	\N	\N	\N	bdb95b8f-e15d-4caa-b765-521007e4cc77	2026-04-19 11:38:27.470216+00	2026-04-19 11:38:27.470216+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	27e94db0-c00e-4b90-ba64-98d7219c0f33	\N	2026-03-31 10:38:27.127919+00	IN_PROGRESS	450000.00	Shina almashtirish	\N	f	\N	\N	\N	26e39163-cf3a-4358-8fca-2e5579716cb0	2026-04-19 11:38:27.470216+00	2026-04-19 11:38:27.470216+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	\N	2026-03-25 08:38:27.127919+00	IN_PROGRESS	250000.00	Tormoz tekshirish	\N	f	\N	\N	\N	593398d5-afc5-44e7-a6ae-7ab67f46cb67	2026-04-19 11:38:27.470217+00	2026-04-19 11:38:27.470217+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	b7baeea9-fc4d-4cf9-a469-4916155f40bc	\N	2026-03-06 07:38:27.127919+00	IN_PROGRESS	350000.00	Diagnostika	\N	f	\N	\N	\N	1e481aab-ad34-47a3-afaf-4ce5a4a05a12	2026-04-19 11:38:27.470217+00	2026-04-19 11:38:27.470217+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	a0cc3386-af63-4387-b8ad-7686da70cd9e	\N	2026-03-21 05:38:27.127919+00	CANCELLED	250000.00	Moy almashtirish kerak	\N	f	\N	\N	\N	19309329-45ad-44a1-ac77-8e0ee758d8b1	2026-04-19 11:38:27.470218+00	2026-04-19 11:38:27.470218+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	\N	2026-03-29 10:38:27.127919+00	CANCELLED	120000.00	Dvigatel shovqin qiladi	\N	f	\N	\N	\N	ce70e87b-fcae-4643-8e23-7aebce91f1c6	2026-04-19 11:38:27.470218+00	2026-04-19 11:38:27.470219+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	a0cc3386-af63-4387-b8ad-7686da70cd9e	\N	2026-03-15 08:38:27.127919+00	CANCELLED	120000.00	Moy almashtirish kerak	\N	f	\N	\N	\N	d73b48fc-345f-46c3-bc56-5eb72af0e0db	2026-04-19 11:38:27.470219+00	2026-04-19 11:38:27.470219+00	f
a82e28be-46c0-40e1-995d-bee60803d783	f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	\N	2026-04-23 06:30:00+00	PENDING	250000.00	\N	\N	f	\N	\N	\N	f55bf36d-ad20-4061-9e68-59aa4bf47082	2026-04-20 12:01:31.474914+00	2026-04-20 12:01:31.474918+00	f
a82e28be-46c0-40e1-995d-bee60803d783	42a94963-592f-48d2-8bde-83ce8a2d786f	\N	2026-04-23 06:30:00+00	PENDING	160000.00	\N	\N	f	\N	\N	\N	d64dff8b-e8c3-4d36-948a-e65b71b5ec4a	2026-04-21 06:52:59.042329+00	2026-04-21 06:52:59.042331+00	f
a82e28be-46c0-40e1-995d-bee60803d783	42a94963-592f-48d2-8bde-83ce8a2d786f	\N	2026-04-22 08:30:00+00	PENDING	60000.00	\N	\N	f	\N	\N	\N	20a01cdf-a1b2-4fb8-ba6a-93c504ec41cf	2026-04-21 06:53:20.444761+00	2026-04-21 06:53:20.444793+00	f
\.


--
-- Data for Name: cashback_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cashback_transactions (wallet_id, amount, type, source, reference_id, expires_at, id, created_at, updated_at, is_deleted) FROM stdin;
d5949930-6ef3-4e5b-8516-84cc50dddc31	11514.00	EARNED	booking	\N	\N	b39d7168-834b-4db0-aa9b-bd14932244e7	2026-04-19 11:38:27.530396+00	2026-04-19 11:38:27.530398+00	f
d5949930-6ef3-4e5b-8516-84cc50dddc31	13904.00	EARNED	booking	\N	\N	c16454a7-3bc9-45d9-938d-a4e8d2412e55	2026-04-19 11:38:27.530399+00	2026-04-19 11:38:27.530399+00	f
d5949930-6ef3-4e5b-8516-84cc50dddc31	10737.00	SPENT	booking	\N	\N	b9b8a315-3d72-4e06-ac3a-2912aae97678	2026-04-19 11:38:27.530399+00	2026-04-19 11:38:27.5304+00	f
d5949930-6ef3-4e5b-8516-84cc50dddc31	3385.00	SPENT	booking	\N	\N	6770a034-9239-4431-a771-c26f9859b815	2026-04-19 11:38:27.5304+00	2026-04-19 11:38:27.5304+00	f
8157b44b-8b6e-47d5-a117-da15d740de2a	3147.00	EARNED	booking	\N	\N	5d4b4967-5d06-44f2-ada5-130e89c5db24	2026-04-19 11:38:27.535551+00	2026-04-19 11:38:27.535552+00	f
8157b44b-8b6e-47d5-a117-da15d740de2a	13248.00	EARNED	booking	\N	\N	2dfd4a84-20ec-4dea-b051-890148f324bd	2026-04-19 11:38:27.535553+00	2026-04-19 11:38:27.535553+00	f
8157b44b-8b6e-47d5-a117-da15d740de2a	5431.00	EARNED	booking	\N	\N	3b6a72d0-e2b7-4b46-9466-1a0252e71b6c	2026-04-19 11:38:27.535554+00	2026-04-19 11:38:27.535554+00	f
5d895116-9380-4c30-ae81-74fababa5569	9966.00	EARNED	booking	\N	\N	d80f51f7-c817-4eb0-a7b7-291212d6abca	2026-04-19 11:38:27.537308+00	2026-04-19 11:38:27.53731+00	f
5d895116-9380-4c30-ae81-74fababa5569	7588.00	EARNED	booking	\N	\N	5b41c752-88d4-4ee6-a563-91a017c20e0b	2026-04-19 11:38:27.537311+00	2026-04-19 11:38:27.537311+00	f
5d895116-9380-4c30-ae81-74fababa5569	3881.00	EARNED	booking	\N	\N	16317e83-bdd2-4310-b01e-f016396c1b04	2026-04-19 11:38:27.537312+00	2026-04-19 11:38:27.537312+00	f
5d895116-9380-4c30-ae81-74fababa5569	3207.00	EARNED	booking	\N	\N	b0c02ae4-3fa0-4d75-a998-82ba29553494	2026-04-19 11:38:27.537312+00	2026-04-19 11:38:27.537313+00	f
5d895116-9380-4c30-ae81-74fababa5569	11424.00	EARNED	booking	\N	\N	bc88d275-955c-4858-a3b3-3fbf8329430e	2026-04-19 11:38:27.537313+00	2026-04-19 11:38:27.537313+00	f
f14b21a0-ffb9-43e2-acd6-8856b4247356	12322.00	EARNED	booking	\N	\N	bf34a26f-95b6-4f74-8bd1-20cf8c843ab6	2026-04-19 11:38:27.538846+00	2026-04-19 11:38:27.538847+00	f
f14b21a0-ffb9-43e2-acd6-8856b4247356	10129.00	EARNED	booking	\N	\N	693cf4c8-815c-4208-8436-ddeb87fb9a09	2026-04-19 11:38:27.538848+00	2026-04-19 11:38:27.538848+00	f
\.


--
-- Data for Name: cashback_wallets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cashback_wallets (user_id, balance, tier, total_earned, total_spent, id, created_at, updated_at, is_deleted) FROM stdin;
a82e28be-46c0-40e1-995d-bee60803d783	92754.00	BRONZE	122478.00	29724.00	d5949930-6ef3-4e5b-8516-84cc50dddc31	2026-04-19 11:38:27.528567+00	2026-04-19 11:38:27.52857+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	34773.00	SILVER	50934.00	16161.00	8157b44b-8b6e-47d5-a117-da15d740de2a	2026-04-19 11:38:27.534852+00	2026-04-19 11:38:27.534854+00	f
49354f6b-ef90-4176-897d-ceaf428d76f2	30728.00	GOLD	40304.00	9576.00	5d895116-9380-4c30-ae81-74fababa5569	2026-04-19 11:38:27.536635+00	2026-04-19 11:38:27.536637+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	110893.00	SILVER	137876.00	26983.00	f14b21a0-ffb9-43e2-acd6-8856b4247356	2026-04-19 11:38:27.538303+00	2026-04-19 11:38:27.538304+00	f
\.


--
-- Data for Name: complaints; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.complaints (complainant_id, against_id, workshop_id, booking_id, type, status, subject, description, resolution, assigned_to, resolved_at, priority, id, created_at, updated_at, is_deleted) FROM stdin;
a82e28be-46c0-40e1-995d-bee60803d783	\N	f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	\N	WARRANTY_ISSUE	IN_PROGRESS	Vaqtida bajarilmadi	Test shikoyat tavsifi — bu test ma'lumot.	\N	\N	\N	2	280a69c1-8dc8-4569-8030-acc74200eaf7	2026-04-19 11:38:27.672779+00	2026-04-19 11:38:27.672779+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	\N	5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	\N	SERVICE_QUALITY	RESOLVED	Vaqtida bajarilmadi	Test shikoyat tavsifi — bu test ma'lumot.	\N	\N	\N	1	6e41b996-4852-484c-84fc-5cc0094db409	2026-04-19 11:38:27.672779+00	2026-04-19 11:38:27.672779+00	f
a82e28be-46c0-40e1-995d-bee60803d783	\N	eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	\N	PAYMENT_ISSUE	OPEN	Kafolat bajarilmadi	Test shikoyat tavsifi — bu test ma'lumot.	\N	\N	\N	1	5ea3f979-2c3e-44e7-87bf-11e38a115b18	2026-04-19 11:38:27.67278+00	2026-04-19 11:38:27.67278+00	f
49354f6b-ef90-4176-897d-ceaf428d76f2	\N	f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	\N	SERVICE_QUALITY	ESCALATED	Vaqtida bajarilmadi	Test shikoyat tavsifi — bu test ma'lumot.	\N	\N	\N	2	8992f678-2726-455b-8626-b626443264ea	2026-04-19 11:38:27.67278+00	2026-04-19 11:38:27.672781+00	f
a82e28be-46c0-40e1-995d-bee60803d783	\N	5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	\N	WARRANTY_ISSUE	RESOLVED	Narx o'zgartirildi	Test shikoyat tavsifi — bu test ma'lumot.	masala yechildi	711f4c35-ccef-4b22-9be0-a0588e21e08b	2026-04-21 07:06:55.983869+00	4	f1e54cb3-abe2-4723-8f54-81b806766d4a	2026-04-19 11:38:27.672775+00	2026-04-21 07:06:55.984637+00	f
\.


--
-- Data for Name: escrows; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.escrows (payment_id, workshop_id, amount, status, released_at, id, created_at, updated_at, is_deleted) FROM stdin;
\.


--
-- Data for Name: favorite_workshops; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.favorite_workshops (user_id, workshop_id, id, created_at, updated_at, is_deleted) FROM stdin;
a82e28be-46c0-40e1-995d-bee60803d783	27e94db0-c00e-4b90-ba64-98d7219c0f33	407735e2-cb86-4150-b58d-c2ee1ace14ac	2026-04-19 11:38:27.676365+00	2026-04-19 11:38:27.676367+00	f
a82e28be-46c0-40e1-995d-bee60803d783	ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	d71d6e1a-7a6e-429e-ab7a-187b1099bde4	2026-04-19 11:38:27.676368+00	2026-04-19 11:38:27.676368+00	f
a82e28be-46c0-40e1-995d-bee60803d783	a0cc3386-af63-4387-b8ad-7686da70cd9e	96b502b1-b050-4add-b680-56cb06260613	2026-04-19 11:38:27.676368+00	2026-04-19 11:38:27.676368+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	a0cc3386-af63-4387-b8ad-7686da70cd9e	f1e4dd17-af6f-449a-b2e3-f3490cd51e5b	2026-04-19 11:38:27.678364+00	2026-04-19 11:38:27.678366+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	4f3a5a4a-cbeb-4ace-b95e-e6f577ebe76e	2026-04-19 11:38:27.678367+00	2026-04-19 11:38:27.678367+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	42a94963-592f-48d2-8bde-83ce8a2d786f	34a32857-5670-45d6-a796-f0ea77e34a3d	2026-04-19 11:38:27.678367+00	2026-04-19 11:38:27.678368+00	f
49354f6b-ef90-4176-897d-ceaf428d76f2	f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	e7bb7d92-990b-4d86-91b9-2f70c156930c	2026-04-19 11:38:27.679697+00	2026-04-19 11:38:27.679699+00	f
49354f6b-ef90-4176-897d-ceaf428d76f2	eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	e53195af-3829-4aa7-b08c-86a0a2d73f05	2026-04-19 11:38:27.6797+00	2026-04-19 11:38:27.6797+00	f
49354f6b-ef90-4176-897d-ceaf428d76f2	42a94963-592f-48d2-8bde-83ce8a2d786f	90869be3-31a1-4de8-8dde-43ae10f3b268	2026-04-19 11:38:27.6797+00	2026-04-19 11:38:27.679701+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	7d676490-8d29-4448-bdd3-43e0d0f3fbad	2026-04-19 11:38:27.680717+00	2026-04-19 11:38:27.680719+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	51e02576-154f-463c-88a8-07f94d662f0b	2026-04-19 11:38:27.68072+00	2026-04-19 11:38:27.68072+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	0384d2a7-82f7-4a34-899f-c88df574e23a	2026-04-19 11:38:27.68072+00	2026-04-19 11:38:27.680721+00	f
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (user_id, title, body, type, data, is_read, sent_via, id, created_at, updated_at, is_deleted) FROM stdin;
a82e28be-46c0-40e1-995d-bee60803d783	Yangi aksiya!	Yangi aksiya! — test bildirishnoma	promo	\N	t	push	aa3bde2c-430c-49b4-9227-b7a74c8c2c1c	2026-04-19 11:38:27.683231+00	2026-04-19 11:38:27.683233+00	f
a82e28be-46c0-40e1-995d-bee60803d783	Cashback olindi!	Cashback olindi! — test bildirishnoma	cashback	\N	t	push	0cc17ead-159b-4816-a1e1-10d94279d313	2026-04-19 11:38:27.683234+00	2026-04-19 11:38:27.683234+00	f
a82e28be-46c0-40e1-995d-bee60803d783	Kafolat eslatmasi	Kafolat eslatmasi — test bildirishnoma	warranty	\N	t	push	fba45934-1135-40a1-9275-f7f81e8d5640	2026-04-19 11:38:27.683234+00	2026-04-19 11:38:27.683234+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	Ustaxona sharhi	Ustaxona sharhi — test bildirishnoma	review	\N	f	push	057223f6-6236-4cfa-91e9-a7d92e10da1d	2026-04-19 11:38:27.684666+00	2026-04-19 11:38:27.684667+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	Yangi aksiya!	Yangi aksiya! — test bildirishnoma	promo	\N	t	push	0ad79e81-18b8-4353-af2b-ba236a53613e	2026-04-19 11:38:27.684668+00	2026-04-19 11:38:27.684668+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	Cashback olindi!	Cashback olindi! — test bildirishnoma	cashback	\N	t	push	f021ae13-219a-4889-961f-6a100ae313e5	2026-04-19 11:38:27.684669+00	2026-04-19 11:38:27.684669+00	f
49354f6b-ef90-4176-897d-ceaf428d76f2	Buyurtma tasdiqlandi	Buyurtma tasdiqlandi — test bildirishnoma	booking	\N	f	push	f9516d85-140e-40c3-861f-2c43784ce060	2026-04-19 11:38:27.68634+00	2026-04-19 11:38:27.686341+00	f
49354f6b-ef90-4176-897d-ceaf428d76f2	Ustaxona sharhi	Ustaxona sharhi — test bildirishnoma	review	\N	t	push	1378678e-27d7-4bf9-a22a-1eb91d704e9e	2026-04-19 11:38:27.686342+00	2026-04-19 11:38:27.686342+00	f
49354f6b-ef90-4176-897d-ceaf428d76f2	Yangi aksiya!	Yangi aksiya! — test bildirishnoma	promo	\N	t	push	eaf19598-360e-4aeb-9699-867c5875c70b	2026-04-19 11:38:27.686343+00	2026-04-19 11:38:27.686343+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	Buyurtma tasdiqlandi	Buyurtma tasdiqlandi — test bildirishnoma	booking	\N	f	push	6135f410-3a2a-4924-b8df-6355779712e2	2026-04-19 11:38:27.687335+00	2026-04-19 11:38:27.687336+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	Yangi aksiya!	Yangi aksiya! — test bildirishnoma	promo	\N	t	push	f8336ba8-d53f-4f4a-aca0-1bd75cc064ec	2026-04-19 11:38:27.687337+00	2026-04-19 11:38:27.687337+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	Ustaxona sharhi	Ustaxona sharhi — test bildirishnoma	review	\N	f	push	35bc350e-23c5-4115-bd91-3cc4c6ae04c1	2026-04-19 11:38:27.687338+00	2026-04-19 11:38:27.687338+00	f
\.


--
-- Data for Name: otp_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.otp_codes (user_phone, code, expires_at, is_used, purpose, id, created_at, updated_at, is_deleted) FROM stdin;
+998901111111	1234	2026-04-19 11:44:49.419946+00	f	LOGIN	7e80b621-e0f7-48ef-adc0-50246d1d0573	2026-04-19 11:39:49.421452+00	2026-04-19 11:39:49.421453+00	f
+998902222222	1234	2026-04-19 11:45:26.116418+00	f	LOGIN	a9866c6b-6901-46b0-9bf4-483297c3c829	2026-04-19 11:40:26.11732+00	2026-04-19 11:40:26.117322+00	f
+998901234567	1234	2026-04-19 11:46:57.22217+00	f	LOGIN	5c45f05b-f657-402a-a259-0b0f85703a63	2026-04-19 11:41:57.222951+00	2026-04-19 11:41:57.222953+00	f
+998902222222	1234	2026-04-19 12:28:52.316994+00	f	LOGIN	79017c16-38c7-406e-8c8b-1f51e5ebcb6c	2026-04-19 12:23:52.318669+00	2026-04-19 12:23:52.318671+00	f
+998901111111	1234	2026-04-19 12:32:01.633746+00	f	LOGIN	6b75f9a5-bfa5-4250-8d95-12e8144e6290	2026-04-19 12:27:01.634681+00	2026-04-19 12:27:01.634683+00	f
+998902222222	1234	2026-04-19 12:34:26.349549+00	f	LOGIN	a3fb8d91-bbb8-4c26-a1a5-57699d8ebe7f	2026-04-19 12:29:26.350343+00	2026-04-19 12:29:26.350345+00	f
+998901111111	1234	2026-04-21 06:49:17.118397+00	f	LOGIN	40761788-ebf8-4a04-a35a-6b97594949cc	2026-04-21 06:44:17.120237+00	2026-04-21 06:44:17.120239+00	f
+998902222222	1234	2026-04-21 06:59:21.776398+00	f	LOGIN	8c454a7e-7e9c-45a4-b970-9ac325ff4a47	2026-04-21 06:54:21.777359+00	2026-04-21 06:54:21.777361+00	f
+998901234567	1234	2026-04-21 07:07:26.198894+00	f	LOGIN	6734b3d1-c3b7-404b-9bc1-09434f929cc0	2026-04-21 07:02:26.199974+00	2026-04-21 07:02:26.199976+00	f
+998902222222	1234	2026-04-21 07:17:52.57978+00	f	LOGIN	ba691ffb-be00-4c69-b305-639d106e1146	2026-04-21 07:12:52.580864+00	2026-04-21 07:12:52.580866+00	f
+998901234567	1234	2026-04-21 07:18:18.957728+00	f	LOGIN	bd337b93-9cfe-43a2-8876-43d18cdc8be0	2026-04-21 07:13:18.958722+00	2026-04-21 07:13:18.958724+00	f
+998905555555	1234	2026-04-21 07:24:01.252707+00	f	LOGIN	0c299723-2d69-4ab9-b8f3-049ccc125be8	2026-04-21 07:19:01.254101+00	2026-04-21 07:19:01.254103+00	f
+998901234567	1234	2026-04-21 07:24:43.313252+00	f	LOGIN	8e30b5f8-be26-4c63-885e-888ceb1d2269	2026-04-21 07:19:43.314226+00	2026-04-21 07:19:43.314227+00	f
+998902222222	1234	2026-04-21 07:25:45.091344+00	f	LOGIN	519c51f4-6ce5-4963-91b4-d2b1ffb9fff7	2026-04-21 07:20:45.092203+00	2026-04-21 07:20:45.092205+00	f
\.


--
-- Data for Name: part_bonus_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.part_bonus_transactions (wallet_id, part_order_id, amount, type, tier_at_time, note, id, created_at, updated_at, is_deleted) FROM stdin;
8fa9e4e3-54b7-443d-a276-5d43b44d7f78	\N	150000.00	earned	STANDART	Birinchi buyurtma bonusi	0d48d36b-33b8-4ec6-b0a4-2a1750110b5d	2026-04-21 07:55:27.814411+00	2026-04-21 07:55:27.814415+00	f
8fa9e4e3-54b7-443d-a276-5d43b44d7f78	\N	300000.00	earned	SILVER	Zapchast buyurtmasi uchun bonus	f67e794c-8d74-4829-bb1e-8a19289f6bd3	2026-04-21 07:55:27.814416+00	2026-04-21 07:55:27.814416+00	f
8fa9e4e3-54b7-443d-a276-5d43b44d7f78	\N	100000.00	withdrawn	SILVER	Naqd yechib olindi	5e793922-61b6-4b3c-bc28-e467282b89a4	2026-04-21 07:55:27.814417+00	2026-04-21 07:55:27.814417+00	f
\.


--
-- Data for Name: part_bonus_wallets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.part_bonus_wallets (partner_id, balance, total_earned, total_withdrawn, tier, monthly_spent, id, created_at, updated_at, is_deleted) FROM stdin;
9e1e6568-546b-46a7-93c1-3634b2896dff	55500.00	55500.00	0.00	STANDART	1850000.00	8fa9e4e3-54b7-443d-a276-5d43b44d7f78	2026-04-19 12:58:12.9326+00	2026-04-21 07:21:35.761211+00	f
\.


--
-- Data for Name: part_brands; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.part_brands (name, country, logo_url, id, created_at, updated_at, is_deleted) FROM stdin;
Castrol	Angliya	\N	4fa0a498-d896-4aaa-8351-e2c3ae1c9300	2026-04-19 11:38:27.548303+00	2026-04-19 11:38:27.548305+00	f
Mobil	AQSH	\N	4e52f191-3158-4856-933a-808d0e23fa1a	2026-04-19 11:38:27.549587+00	2026-04-19 11:38:27.549589+00	f
Bosch	Germaniya	\N	c694e994-e836-4fea-938f-5945efdb6f3a	2026-04-19 11:38:27.550425+00	2026-04-19 11:38:27.550427+00	f
Mann-Filter	Germaniya	\N	41fc653b-d53b-4d06-915e-dcbeefddd2f2	2026-04-19 11:38:27.551246+00	2026-04-19 11:38:27.551247+00	f
TRW	Germaniya	\N	fa870a64-46f2-4507-8da7-b09b1c8956a5	2026-04-19 11:38:27.552064+00	2026-04-19 11:38:27.552065+00	f
Varta	Germaniya	\N	cb969556-b1ca-4087-82bb-fab7b2f0a58a	2026-04-19 11:38:27.552854+00	2026-04-19 11:38:27.552856+00	f
Denso	Yaponiya	\N	8f0d953f-8649-4519-a1b1-9cb887ad2fba	2026-04-19 11:38:27.553649+00	2026-04-19 11:38:27.553651+00	f
\.


--
-- Data for Name: part_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.part_categories (name, slug, parent_id, icon_url, id, created_at, updated_at, is_deleted) FROM stdin;
Dvigatel moylari	moylar	\N	\N	cc4740b4-3234-4285-8558-8728180a37e4	2026-04-19 11:38:27.541126+00	2026-04-19 11:38:27.541127+00	f
Filtrlar	filtrlar	\N	\N	56d6c342-4f3e-4622-a6b4-7001d5b7ff12	2026-04-19 11:38:27.542282+00	2026-04-19 11:38:27.542284+00	f
Tormoz qismlari	tormoz	\N	\N	7435ec34-0626-4ee0-8495-63a8ff2312bc	2026-04-19 11:38:27.543142+00	2026-04-19 11:38:27.543143+00	f
Akkumulyatorlar	akkumulyator	\N	\N	e276ecd1-dddb-40d9-b73e-c8946d480391	2026-04-19 11:38:27.543969+00	2026-04-19 11:38:27.543971+00	f
Elektr qismlari	elektr	\N	\N	4550b3ae-fdfb-4c8d-b7a7-e35bd5919794	2026-04-19 11:38:27.544819+00	2026-04-19 11:38:27.54482+00	f
Sovutish tizimi	sovutish	\N	\N	755ace90-6cbf-4042-afa4-6e34d825e328	2026-04-19 11:38:27.545617+00	2026-04-19 11:38:27.545619+00	f
Kuzuv	kuzuv	\N	\N	ed7b41e8-fb2f-42c0-899c-061755576a9e	2026-04-21 07:09:53.233303+00	2026-04-21 07:09:53.233305+00	f
\.


--
-- Data for Name: part_inventories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.part_inventories (part_id, quantity_available, quantity_reserved, id, created_at, updated_at, is_deleted) FROM stdin;
0ad4b66c-afbd-4f82-9b9e-d9d4c1784343	25	0	826b904d-9aa6-4168-824a-7ae9294439cb	2026-04-19 11:38:27.559764+00	2026-04-19 11:38:27.559766+00	f
c6cd2650-3b2c-4656-8675-c3e366e173fd	40	0	20e4db59-2b83-4bf0-a02a-1a36586e4f32	2026-04-19 11:38:27.564381+00	2026-04-19 11:38:27.564383+00	f
8d000d6c-d4b0-4ad6-a4f9-18906bd97337	18	0	76660fd5-5c01-46d3-b365-7189a66a8d1e	2026-04-19 11:38:27.567492+00	2026-04-19 11:38:27.567494+00	f
04e052cb-e87b-4d16-bd36-3af556d1ba73	30	0	173e1983-2ca1-42d3-a82f-f216d74383b6	2026-04-19 11:38:27.570564+00	2026-04-19 11:38:27.570566+00	f
b848012a-91b7-4fb8-b436-3cea10787f6a	50	0	7bd6c1eb-969b-4f9b-88e1-d9c557ef1d6a	2026-04-19 11:38:27.573578+00	2026-04-19 11:38:27.573579+00	f
41cd3891-3c3d-4315-8ef1-cd7a6b329711	80	0	6361ad01-10e0-45a8-a4f1-8e2e894136ba	2026-04-19 11:38:27.576756+00	2026-04-19 11:38:27.576758+00	f
7d17d86f-6f44-4d7f-8a45-a378220d188b	65	0	a8dd1bfd-e208-4932-850e-58970a74fa72	2026-04-19 11:38:27.579836+00	2026-04-19 11:38:27.579838+00	f
530abdab-0058-4f92-a45a-ac9a27ee5c69	45	0	fdccabeb-e60c-47ef-a07f-f89a652f10a9	2026-04-19 11:38:27.582667+00	2026-04-19 11:38:27.582669+00	f
4a43b6d9-8297-49ea-ae28-e9918e42215b	35	0	1a96c4bd-668a-42cb-83e1-a496751ca131	2026-04-19 11:38:27.585494+00	2026-04-19 11:38:27.585496+00	f
bb31a6ff-de00-4a2c-9d9c-7f69d8a3a443	55	0	1d9b4bfc-f97c-40cf-b804-4bfd571296dd	2026-04-19 11:38:27.588416+00	2026-04-19 11:38:27.588418+00	f
e9770a6c-295c-40ba-8a63-a4e9ed876093	20	0	565fc38e-dbd3-4248-bc85-741d9e4955ea	2026-04-19 11:38:27.590956+00	2026-04-19 11:38:27.590958+00	f
1c24cbe0-c149-4dc9-9445-9725cd3aeb87	15	0	7e601ade-9b3f-4771-a1fc-e2d00765056d	2026-04-19 11:38:27.593661+00	2026-04-19 11:38:27.593662+00	f
b939e2ca-f55f-4408-bf02-4abda2b0ee67	10	0	288e8ca5-e97b-4de8-94b6-bf66f6b22cfa	2026-04-19 11:38:27.596259+00	2026-04-19 11:38:27.59626+00	f
9a1a5faf-55d5-4cdc-b616-3217e92196b8	60	0	9fb41e9e-8067-4500-936c-100ac9990227	2026-04-19 11:38:27.598836+00	2026-04-19 11:38:27.598838+00	f
0a0f6405-a3c4-4407-8971-650cc659601e	25	0	901b79c2-c835-46a9-8d42-a8696350f744	2026-04-19 11:38:27.601363+00	2026-04-19 11:38:27.601365+00	f
129a99e4-dca3-4c2e-bfcf-4afe4f542ad9	12	0	0ac67120-eb0a-4a02-a580-e821e30b6eb0	2026-04-19 11:38:27.604411+00	2026-04-19 11:38:27.604412+00	f
c228239d-d1c4-4236-9cb9-e7808189383a	8	0	1264bfa4-0557-44b5-80ae-8da2d7ef4483	2026-04-19 11:38:27.607251+00	2026-04-19 11:38:27.607252+00	f
1066d388-e709-43ed-b042-83a335050668	6	0	5873356d-3a8e-41f6-ad54-c27266a81695	2026-04-19 11:38:27.610111+00	2026-04-19 11:38:27.610113+00	f
48ce2bbb-fd52-4167-9571-8ad49e68e387	5	0	68803c28-6051-4206-801f-237024a3a148	2026-04-19 11:38:27.613281+00	2026-04-19 11:38:27.613282+00	f
4be36249-0483-4ced-b090-d106e4872a29	4	0	3e7b0bc6-3e74-4366-9fcf-ca928bd39694	2026-04-19 11:38:27.616086+00	2026-04-19 11:38:27.616087+00	f
bac0c541-2558-4028-95f9-ce9437679068	100	0	e0637db5-d58f-49bf-bd6d-5b7b71227e18	2026-04-19 11:38:27.618872+00	2026-04-19 11:38:27.618873+00	f
a93e0f52-1e0d-4419-a54a-b54632bc5051	7	0	f870c394-5201-4295-8061-51448b025458	2026-04-19 11:38:27.621792+00	2026-04-19 11:38:27.621794+00	f
0d0d8217-4f19-4c45-af04-3a77af819c4e	30	0	8be2f35c-f4e8-4df3-875a-4e9f3993a0fc	2026-04-19 11:38:27.624683+00	2026-04-19 11:38:27.624685+00	f
5565cf7a-a347-47c5-9047-a3174784343c	9	0	2ea876b3-85e7-4b26-8597-44b3974c088e	2026-04-19 11:38:27.627644+00	2026-04-19 11:38:27.627646+00	f
27cc1344-17c8-434e-88a8-ffb3e298d564	20	0	ab610779-e99b-4f21-a259-77254e494948	2026-04-19 11:38:27.630588+00	2026-04-19 11:38:27.63059+00	f
\.


--
-- Data for Name: part_order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.part_order_items (order_id, part_id, quantity, unit_price, is_available, admin_note, id, created_at, updated_at, is_deleted) FROM stdin;
65896a78-4f1f-4980-8555-27ad22de863a	b848012a-91b7-4fb8-b436-3cea10787f6a	2	95000.00	t	\N	9d1f0ae8-c850-42e8-890c-f94bb4d6f581	2026-04-19 11:38:27.647753+00	2026-04-19 11:38:27.647755+00	f
29cdab83-c8b2-4208-b57a-e593d6f8dd48	4a43b6d9-8297-49ea-ae28-e9918e42215b	2	42000.00	t	\N	3931f2e3-0212-4ea2-801d-33abc7feb75a	2026-04-19 11:38:27.650045+00	2026-04-19 11:38:27.650047+00	f
8b1babb6-9d11-4be8-95c5-72080b5caab7	c6cd2650-3b2c-4656-8675-c3e366e173fd	2	140000.00	t	\N	0894c6a6-5b90-4f0d-94ef-7ce148401c63	2026-04-19 11:38:27.651595+00	2026-04-19 11:38:27.651596+00	f
37c104ce-f969-40af-9603-0bd5bdeee49c	c6cd2650-3b2c-4656-8675-c3e366e173fd	2	140000.00	t	\N	0339bf1d-555a-4deb-bcc9-92ba7f0fb325	2026-04-19 11:38:27.655632+00	2026-04-19 11:38:27.655635+00	f
d194bd2c-c1d0-4f6a-9fac-ec4b2847863a	0ad4b66c-afbd-4f82-9b9e-d9d4c1784343	2	185000.00	t	\N	531308fc-2857-49b9-b8b6-b3a9b84edcc5	2026-04-19 11:38:27.657536+00	2026-04-19 11:38:27.657537+00	f
d406ec51-5102-434e-aa06-9fe2273cba19	c228239d-d1c4-4236-9cb9-e7808189383a	1	470000.00	t	\N	57aa8e82-0d3a-43ff-9023-1451c171043d	2026-04-19 11:41:38.671012+00	2026-04-19 11:41:38.671015+00	f
d406ec51-5102-434e-aa06-9fe2273cba19	4be36249-0483-4ced-b090-d106e4872a29	1	380000.00	t	\N	42eabcc7-32af-4d1b-a186-971fae44963c	2026-04-19 11:41:38.671017+00	2026-04-19 11:41:38.671018+00	f
d406ec51-5102-434e-aa06-9fe2273cba19	b939e2ca-f55f-4408-bf02-4abda2b0ee67	1	155000.00	t	\N	283eab47-a4f0-46bf-8c50-31b5e05a6c55	2026-04-19 11:41:38.67102+00	2026-04-19 11:41:38.67102+00	f
d36577b8-ef95-4d28-b9da-48718a33ece5	0ad4b66c-afbd-4f82-9b9e-d9d4c1784343	1	160000.00	t	+	b08b9e42-4bef-46bd-ba2d-d07873e2829f	2026-04-21 06:58:09.500952+00	2026-04-21 07:12:30.151797+00	f
d36577b8-ef95-4d28-b9da-48718a33ece5	c6cd2650-3b2c-4656-8675-c3e366e173fd	1	120000.00	t		3fde0ef0-e65f-41e0-91d1-fb9291df1275	2026-04-21 06:58:09.500958+00	2026-04-21 07:12:30.15678+00	f
d36577b8-ef95-4d28-b9da-48718a33ece5	04e052cb-e87b-4d16-bd36-3af556d1ba73	4	145000.00	t	+	8143f6d1-3f7d-4944-843c-58cee05b7898	2026-04-21 06:58:09.50096+00	2026-04-21 07:12:30.162881+00	f
0e9c8bd6-95f3-4990-b7b6-af03ceb1b079	c228239d-d1c4-4236-9cb9-e7808189383a	1	470000.00	t	\N	cabda6fa-dd15-4957-83fd-9d47aeb5e2d6	2026-04-21 07:21:30.550067+00	2026-04-21 07:21:30.550069+00	f
0e9c8bd6-95f3-4990-b7b6-af03ceb1b079	1066d388-e709-43ed-b042-83a335050668	1	590000.00	t	\N	ab421ead-729c-4376-ba42-4ffb1f538399	2026-04-21 07:21:30.550072+00	2026-04-21 07:21:30.550073+00	f
\.


--
-- Data for Name: part_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.part_orders (workshop_id, customer_id, booking_id, status, delivery_address, delivery_fee, total_amount, id, created_at, updated_at, is_deleted) FROM stdin;
f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	9e1e6568-546b-46a7-93c1-3634b2896dff	\N	PENDING	Toshkent, Sergeli tumani	20000.00	210000.00	65896a78-4f1f-4980-8555-27ad22de863a	2026-04-19 11:38:27.646042+00	2026-04-19 11:38:27.646044+00	f
5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	9e1e6568-546b-46a7-93c1-3634b2896dff	\N	ADMIN_REVIEWED	Toshkent, Yakkasaroy, Shota Rustaveli	20000.00	104000.00	29cdab83-c8b2-4208-b57a-e593d6f8dd48	2026-04-19 11:38:27.649364+00	2026-04-19 11:38:27.649365+00	f
5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	9e1e6568-546b-46a7-93c1-3634b2896dff	\N	PARTNER_CONFIRMED	Toshkent, Yakkasaroy, Shota Rustaveli	20000.00	300000.00	8b1babb6-9d11-4be8-95c5-72080b5caab7	2026-04-19 11:38:27.65098+00	2026-04-19 11:38:27.650982+00	f
eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	9e1e6568-546b-46a7-93c1-3634b2896dff	\N	SHIPPED	Toshkent, Shayxontohur tumani	20000.00	300000.00	37c104ce-f969-40af-9603-0bd5bdeee49c	2026-04-19 11:38:27.654664+00	2026-04-19 11:38:27.654667+00	f
5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	9e1e6568-546b-46a7-93c1-3634b2896dff	\N	DELIVERED	Toshkent, Yakkasaroy, Shota Rustaveli	20000.00	390000.00	d194bd2c-c1d0-4f6a-9fac-ec4b2847863a	2026-04-19 11:38:27.656877+00	2026-04-19 11:38:27.656879+00	f
a0cc3386-af63-4387-b8ad-7686da70cd9e	9e1e6568-546b-46a7-93c1-3634b2896dff	d73b48fc-345f-46c3-bc56-5eb72af0e0db	PENDING	Ustaxona manzili	0.00	1005000.00	d406ec51-5102-434e-aa06-9fe2273cba19	2026-04-19 11:41:38.664927+00	2026-04-19 11:41:38.664929+00	f
a0cc3386-af63-4387-b8ad-7686da70cd9e	9e1e6568-546b-46a7-93c1-3634b2896dff	bfb3a97f-8ca1-4f45-9882-d80e777ac2bc	SHIPPED	Ustaxona manzili	0.00	860000.00	d36577b8-ef95-4d28-b9da-48718a33ece5	2026-04-21 06:58:09.495088+00	2026-04-21 07:13:29.717424+00	f
a0cc3386-af63-4387-b8ad-7686da70cd9e	9e1e6568-546b-46a7-93c1-3634b2896dff	\N	PENDING	Ustaxona manzili	0.00	1060000.00	0e9c8bd6-95f3-4990-b7b6-af03ceb1b079	2026-04-21 07:21:30.548835+00	2026-04-21 07:21:30.548837+00	f
\.


--
-- Data for Name: part_prices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.part_prices (part_id, price_retail, price_wholesale, valid_from, valid_to, id, created_at, updated_at, is_deleted) FROM stdin;
0ad4b66c-afbd-4f82-9b9e-d9d4c1784343	185000.00	160000.00	2026-04-19 11:38:27.127919+00	\N	e8d5cafc-1172-45cd-ab39-9b2488bd053b	2026-04-19 11:38:27.561004+00	2026-04-19 11:38:27.561006+00	f
c6cd2650-3b2c-4656-8675-c3e366e173fd	140000.00	120000.00	2026-04-19 11:38:27.127919+00	\N	5d3fd2b7-b207-468d-8138-00582bca88d3	2026-04-19 11:38:27.564764+00	2026-04-19 11:38:27.564765+00	f
8d000d6c-d4b0-4ad6-a4f9-18906bd97337	210000.00	185000.00	2026-04-19 11:38:27.127919+00	\N	ddda2f63-5df1-4772-b632-e237d3c201a2	2026-04-19 11:38:27.567903+00	2026-04-19 11:38:27.567905+00	f
04e052cb-e87b-4d16-bd36-3af556d1ba73	165000.00	145000.00	2026-04-19 11:38:27.127919+00	\N	b13714ef-2c0d-4ffe-9b9b-28f3dba07c4c	2026-04-19 11:38:27.570953+00	2026-04-19 11:38:27.570954+00	f
b848012a-91b7-4fb8-b436-3cea10787f6a	95000.00	80000.00	2026-04-19 11:38:27.127919+00	\N	82206d36-fba4-46c0-854f-8d95d0ae1fa2	2026-04-19 11:38:27.573943+00	2026-04-19 11:38:27.573944+00	f
41cd3891-3c3d-4315-8ef1-cd7a6b329711	35000.00	28000.00	2026-04-19 11:38:27.127919+00	\N	98b4c76f-fe70-4f5b-a824-fbcc5b7baf63	2026-04-19 11:38:27.577156+00	2026-04-19 11:38:27.577157+00	f
7d17d86f-6f44-4d7f-8a45-a378220d188b	28000.00	22000.00	2026-04-19 11:38:27.127919+00	\N	e8760e36-8abd-4ddc-8138-fdb36f915bfb	2026-04-19 11:38:27.580153+00	2026-04-19 11:38:27.580154+00	f
530abdab-0058-4f92-a45a-ac9a27ee5c69	32000.00	26000.00	2026-04-19 11:38:27.127919+00	\N	88e2fc0b-8a4b-4278-ab16-6c6fc0f00157	2026-04-19 11:38:27.583002+00	2026-04-19 11:38:27.583003+00	f
4a43b6d9-8297-49ea-ae28-e9918e42215b	42000.00	35000.00	2026-04-19 11:38:27.127919+00	\N	fc573aa8-db40-4d1a-bf3f-93d6f9b55d27	2026-04-19 11:38:27.585906+00	2026-04-19 11:38:27.585907+00	f
bb31a6ff-de00-4a2c-9d9c-7f69d8a3a443	38000.00	30000.00	2026-04-19 11:38:27.127919+00	\N	5b99d14b-ee05-423c-926e-567d67be1e89	2026-04-19 11:38:27.588755+00	2026-04-19 11:38:27.588757+00	f
e9770a6c-295c-40ba-8a63-a4e9ed876093	120000.00	100000.00	2026-04-19 11:38:27.127919+00	\N	40a091a9-6568-4fc7-916a-fac05b884e44	2026-04-19 11:38:27.591263+00	2026-04-19 11:38:27.591264+00	f
1c24cbe0-c149-4dc9-9445-9725cd3aeb87	95000.00	80000.00	2026-04-19 11:38:27.127919+00	\N	4e5c073d-9f57-44f7-9f22-7cc36bf44db7	2026-04-19 11:38:27.594033+00	2026-04-19 11:38:27.594035+00	f
b939e2ca-f55f-4408-bf02-4abda2b0ee67	180000.00	155000.00	2026-04-19 11:38:27.127919+00	\N	e9b6965a-7b24-4634-ba34-c703d721a39c	2026-04-19 11:38:27.596559+00	2026-04-19 11:38:27.59656+00	f
9a1a5faf-55d5-4cdc-b616-3217e92196b8	45000.00	38000.00	2026-04-19 11:38:27.127919+00	\N	f9702d79-2eb8-46a7-b11b-209b33fdae2f	2026-04-19 11:38:27.599179+00	2026-04-19 11:38:27.59918+00	f
0a0f6405-a3c4-4407-8971-650cc659601e	135000.00	115000.00	2026-04-19 11:38:27.127919+00	\N	c89f276c-81f1-4ead-b7d3-74f4e8fc89ab	2026-04-19 11:38:27.601769+00	2026-04-19 11:38:27.60177+00	f
129a99e4-dca3-4c2e-bfcf-4afe4f542ad9	450000.00	400000.00	2026-04-19 11:38:27.127919+00	\N	37dc2e65-4ebc-420d-b689-c8b38114cb75	2026-04-19 11:38:27.60478+00	2026-04-19 11:38:27.604781+00	f
c228239d-d1c4-4236-9cb9-e7808189383a	520000.00	470000.00	2026-04-19 11:38:27.127919+00	\N	eb45993d-9d93-4558-8f3f-a8d46214a4d0	2026-04-19 11:38:27.607554+00	2026-04-19 11:38:27.607555+00	f
1066d388-e709-43ed-b042-83a335050668	650000.00	590000.00	2026-04-19 11:38:27.127919+00	\N	27a0d43e-16d6-4467-97cb-f2f5f5807700	2026-04-19 11:38:27.610489+00	2026-04-19 11:38:27.61049+00	f
48ce2bbb-fd52-4167-9571-8ad49e68e387	350000.00	310000.00	2026-04-19 11:38:27.127919+00	\N	92b61997-53fd-4b95-95d6-56d18824a2b8	2026-04-19 11:38:27.613596+00	2026-04-19 11:38:27.613598+00	f
4be36249-0483-4ced-b090-d106e4872a29	420000.00	380000.00	2026-04-19 11:38:27.127919+00	\N	d97b0df9-1eeb-48c3-a8a2-7a7998eaefc6	2026-04-19 11:38:27.616401+00	2026-04-19 11:38:27.616402+00	f
bac0c541-2558-4028-95f9-ce9437679068	48000.00	40000.00	2026-04-19 11:38:27.127919+00	\N	d0620c40-58b7-4710-8efe-3c81d1f91774	2026-04-19 11:38:27.619235+00	2026-04-19 11:38:27.619237+00	f
a93e0f52-1e0d-4419-a54a-b54632bc5051	280000.00	250000.00	2026-04-19 11:38:27.127919+00	\N	0911dfcc-df3a-4cf9-8a41-8b37e0f87857	2026-04-19 11:38:27.622223+00	2026-04-19 11:38:27.622225+00	f
0d0d8217-4f19-4c45-af04-3a77af819c4e	85000.00	72000.00	2026-04-19 11:38:27.127919+00	\N	98e6506c-356a-4b23-a794-fc5b42143d1e	2026-04-19 11:38:27.62498+00	2026-04-19 11:38:27.624981+00	f
5565cf7a-a347-47c5-9047-a3174784343c	190000.00	165000.00	2026-04-19 11:38:27.127919+00	\N	4c3a06d1-ba8b-4f59-93a7-8f80c4d0520d	2026-04-19 11:38:27.627968+00	2026-04-19 11:38:27.62797+00	f
27cc1344-17c8-434e-88a8-ffb3e298d564	65000.00	55000.00	2026-04-19 11:38:27.127919+00	\N	03115dda-cd69-4069-bc16-2fbb4e4c9a62	2026-04-19 11:38:27.630923+00	2026-04-19 11:38:27.630924+00	f
\.


--
-- Data for Name: part_vehicle_models; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.part_vehicle_models (part_id, vehicle_model_id) FROM stdin;
0ad4b66c-afbd-4f82-9b9e-d9d4c1784343	0cfcf118-60fe-4c2a-97d5-618833c25650
0ad4b66c-afbd-4f82-9b9e-d9d4c1784343	c9408c9a-452d-4663-b16c-493816d5a25d
0ad4b66c-afbd-4f82-9b9e-d9d4c1784343	e7e8ae93-eeee-4199-b2d7-52e10483c082
c6cd2650-3b2c-4656-8675-c3e366e173fd	0cfcf118-60fe-4c2a-97d5-618833c25650
c6cd2650-3b2c-4656-8675-c3e366e173fd	c9408c9a-452d-4663-b16c-493816d5a25d
c6cd2650-3b2c-4656-8675-c3e366e173fd	e7e8ae93-eeee-4199-b2d7-52e10483c082
8d000d6c-d4b0-4ad6-a4f9-18906bd97337	0cfcf118-60fe-4c2a-97d5-618833c25650
8d000d6c-d4b0-4ad6-a4f9-18906bd97337	c9408c9a-452d-4663-b16c-493816d5a25d
8d000d6c-d4b0-4ad6-a4f9-18906bd97337	e7e8ae93-eeee-4199-b2d7-52e10483c082
04e052cb-e87b-4d16-bd36-3af556d1ba73	0cfcf118-60fe-4c2a-97d5-618833c25650
04e052cb-e87b-4d16-bd36-3af556d1ba73	c9408c9a-452d-4663-b16c-493816d5a25d
04e052cb-e87b-4d16-bd36-3af556d1ba73	e7e8ae93-eeee-4199-b2d7-52e10483c082
b848012a-91b7-4fb8-b436-3cea10787f6a	0cfcf118-60fe-4c2a-97d5-618833c25650
b848012a-91b7-4fb8-b436-3cea10787f6a	c9408c9a-452d-4663-b16c-493816d5a25d
b848012a-91b7-4fb8-b436-3cea10787f6a	e7e8ae93-eeee-4199-b2d7-52e10483c082
41cd3891-3c3d-4315-8ef1-cd7a6b329711	0cfcf118-60fe-4c2a-97d5-618833c25650
41cd3891-3c3d-4315-8ef1-cd7a6b329711	c9408c9a-452d-4663-b16c-493816d5a25d
41cd3891-3c3d-4315-8ef1-cd7a6b329711	e7e8ae93-eeee-4199-b2d7-52e10483c082
7d17d86f-6f44-4d7f-8a45-a378220d188b	0cfcf118-60fe-4c2a-97d5-618833c25650
7d17d86f-6f44-4d7f-8a45-a378220d188b	c9408c9a-452d-4663-b16c-493816d5a25d
7d17d86f-6f44-4d7f-8a45-a378220d188b	e7e8ae93-eeee-4199-b2d7-52e10483c082
530abdab-0058-4f92-a45a-ac9a27ee5c69	0cfcf118-60fe-4c2a-97d5-618833c25650
530abdab-0058-4f92-a45a-ac9a27ee5c69	c9408c9a-452d-4663-b16c-493816d5a25d
530abdab-0058-4f92-a45a-ac9a27ee5c69	e7e8ae93-eeee-4199-b2d7-52e10483c082
4a43b6d9-8297-49ea-ae28-e9918e42215b	0cfcf118-60fe-4c2a-97d5-618833c25650
4a43b6d9-8297-49ea-ae28-e9918e42215b	c9408c9a-452d-4663-b16c-493816d5a25d
4a43b6d9-8297-49ea-ae28-e9918e42215b	e7e8ae93-eeee-4199-b2d7-52e10483c082
bb31a6ff-de00-4a2c-9d9c-7f69d8a3a443	0cfcf118-60fe-4c2a-97d5-618833c25650
bb31a6ff-de00-4a2c-9d9c-7f69d8a3a443	c9408c9a-452d-4663-b16c-493816d5a25d
bb31a6ff-de00-4a2c-9d9c-7f69d8a3a443	e7e8ae93-eeee-4199-b2d7-52e10483c082
e9770a6c-295c-40ba-8a63-a4e9ed876093	0cfcf118-60fe-4c2a-97d5-618833c25650
e9770a6c-295c-40ba-8a63-a4e9ed876093	c9408c9a-452d-4663-b16c-493816d5a25d
1c24cbe0-c149-4dc9-9445-9725cd3aeb87	0cfcf118-60fe-4c2a-97d5-618833c25650
1c24cbe0-c149-4dc9-9445-9725cd3aeb87	c9408c9a-452d-4663-b16c-493816d5a25d
b939e2ca-f55f-4408-bf02-4abda2b0ee67	0cfcf118-60fe-4c2a-97d5-618833c25650
b939e2ca-f55f-4408-bf02-4abda2b0ee67	c9408c9a-452d-4663-b16c-493816d5a25d
9a1a5faf-55d5-4cdc-b616-3217e92196b8	0cfcf118-60fe-4c2a-97d5-618833c25650
9a1a5faf-55d5-4cdc-b616-3217e92196b8	c9408c9a-452d-4663-b16c-493816d5a25d
0a0f6405-a3c4-4407-8971-650cc659601e	0cfcf118-60fe-4c2a-97d5-618833c25650
0a0f6405-a3c4-4407-8971-650cc659601e	c9408c9a-452d-4663-b16c-493816d5a25d
129a99e4-dca3-4c2e-bfcf-4afe4f542ad9	0cfcf118-60fe-4c2a-97d5-618833c25650
129a99e4-dca3-4c2e-bfcf-4afe4f542ad9	e7e8ae93-eeee-4199-b2d7-52e10483c082
129a99e4-dca3-4c2e-bfcf-4afe4f542ad9	2f28219c-c669-40f2-88ae-10c6d0ad3aa0
c228239d-d1c4-4236-9cb9-e7808189383a	0cfcf118-60fe-4c2a-97d5-618833c25650
c228239d-d1c4-4236-9cb9-e7808189383a	e7e8ae93-eeee-4199-b2d7-52e10483c082
c228239d-d1c4-4236-9cb9-e7808189383a	2f28219c-c669-40f2-88ae-10c6d0ad3aa0
1066d388-e709-43ed-b042-83a335050668	0cfcf118-60fe-4c2a-97d5-618833c25650
1066d388-e709-43ed-b042-83a335050668	e7e8ae93-eeee-4199-b2d7-52e10483c082
1066d388-e709-43ed-b042-83a335050668	2f28219c-c669-40f2-88ae-10c6d0ad3aa0
48ce2bbb-fd52-4167-9571-8ad49e68e387	0cfcf118-60fe-4c2a-97d5-618833c25650
48ce2bbb-fd52-4167-9571-8ad49e68e387	e7e8ae93-eeee-4199-b2d7-52e10483c082
48ce2bbb-fd52-4167-9571-8ad49e68e387	2f28219c-c669-40f2-88ae-10c6d0ad3aa0
4be36249-0483-4ced-b090-d106e4872a29	0cfcf118-60fe-4c2a-97d5-618833c25650
4be36249-0483-4ced-b090-d106e4872a29	e7e8ae93-eeee-4199-b2d7-52e10483c082
4be36249-0483-4ced-b090-d106e4872a29	2f28219c-c669-40f2-88ae-10c6d0ad3aa0
bac0c541-2558-4028-95f9-ce9437679068	0cfcf118-60fe-4c2a-97d5-618833c25650
bac0c541-2558-4028-95f9-ce9437679068	e7e8ae93-eeee-4199-b2d7-52e10483c082
bac0c541-2558-4028-95f9-ce9437679068	2f28219c-c669-40f2-88ae-10c6d0ad3aa0
a93e0f52-1e0d-4419-a54a-b54632bc5051	0cfcf118-60fe-4c2a-97d5-618833c25650
a93e0f52-1e0d-4419-a54a-b54632bc5051	e7e8ae93-eeee-4199-b2d7-52e10483c082
a93e0f52-1e0d-4419-a54a-b54632bc5051	2f28219c-c669-40f2-88ae-10c6d0ad3aa0
0d0d8217-4f19-4c45-af04-3a77af819c4e	0cfcf118-60fe-4c2a-97d5-618833c25650
0d0d8217-4f19-4c45-af04-3a77af819c4e	e7e8ae93-eeee-4199-b2d7-52e10483c082
0d0d8217-4f19-4c45-af04-3a77af819c4e	2f28219c-c669-40f2-88ae-10c6d0ad3aa0
5565cf7a-a347-47c5-9047-a3174784343c	0cfcf118-60fe-4c2a-97d5-618833c25650
5565cf7a-a347-47c5-9047-a3174784343c	e7e8ae93-eeee-4199-b2d7-52e10483c082
5565cf7a-a347-47c5-9047-a3174784343c	2f28219c-c669-40f2-88ae-10c6d0ad3aa0
27cc1344-17c8-434e-88a8-ffb3e298d564	0cfcf118-60fe-4c2a-97d5-618833c25650
27cc1344-17c8-434e-88a8-ffb3e298d564	e7e8ae93-eeee-4199-b2d7-52e10483c082
27cc1344-17c8-434e-88a8-ffb3e298d564	2f28219c-c669-40f2-88ae-10c6d0ad3aa0
\.


--
-- Data for Name: parts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.parts (sku, name, category_id, brand_id, description, specifications, compatible_vehicles, images, weight_kg, is_active, id, created_at, updated_at, is_deleted) FROM stdin;
MOY-001	Castrol Edge 5W-30 4L	cc4740b4-3234-4285-8558-8728180a37e4	4fa0a498-d896-4aaa-8351-e2c3ae1c9300	Castrol Edge 5W-30 4L — sifatli mahsulot	\N	\N	\N	\N	t	0ad4b66c-afbd-4f82-9b9e-d9d4c1784343	2026-04-19 11:38:27.55625+00	2026-04-19 11:38:27.556252+00	f
MOY-002	Castrol Magnatec 10W-40 4L	cc4740b4-3234-4285-8558-8728180a37e4	4fa0a498-d896-4aaa-8351-e2c3ae1c9300	Castrol Magnatec 10W-40 4L — sifatli mahsulot	\N	\N	\N	\N	t	c6cd2650-3b2c-4656-8675-c3e366e173fd	2026-04-19 11:38:27.5625+00	2026-04-19 11:38:27.562501+00	f
MOY-003	Mobil 1 5W-40 4L	cc4740b4-3234-4285-8558-8728180a37e4	4e52f191-3158-4856-933a-808d0e23fa1a	Mobil 1 5W-40 4L — sifatli mahsulot	\N	\N	\N	\N	t	8d000d6c-d4b0-4ad6-a4f9-18906bd97337	2026-04-19 11:38:27.56575+00	2026-04-19 11:38:27.565752+00	f
MOY-004	Mobil Super 3000 5W-30	cc4740b4-3234-4285-8558-8728180a37e4	4e52f191-3158-4856-933a-808d0e23fa1a	Mobil Super 3000 5W-30 — sifatli mahsulot	\N	\N	\N	\N	t	04e052cb-e87b-4d16-bd36-3af556d1ba73	2026-04-19 11:38:27.568868+00	2026-04-19 11:38:27.56887+00	f
MOY-005	Castrol GTX 15W-40 4L	cc4740b4-3234-4285-8558-8728180a37e4	4fa0a498-d896-4aaa-8351-e2c3ae1c9300	Castrol GTX 15W-40 4L — sifatli mahsulot	\N	\N	\N	\N	t	b848012a-91b7-4fb8-b436-3cea10787f6a	2026-04-19 11:38:27.571894+00	2026-04-19 11:38:27.571896+00	f
FLT-001	Mann W 712/95 moy filtri	56d6c342-4f3e-4622-a6b4-7001d5b7ff12	41fc653b-d53b-4d06-915e-dcbeefddd2f2	Mann W 712/95 moy filtri — sifatli mahsulot	\N	\N	\N	\N	t	41cd3891-3c3d-4315-8ef1-cd7a6b329711	2026-04-19 11:38:27.574875+00	2026-04-19 11:38:27.574877+00	f
FLT-002	Mann C 2568 havo filtri	56d6c342-4f3e-4622-a6b4-7001d5b7ff12	41fc653b-d53b-4d06-915e-dcbeefddd2f2	Mann C 2568 havo filtri — sifatli mahsulot	\N	\N	\N	\N	t	7d17d86f-6f44-4d7f-8a45-a378220d188b	2026-04-19 11:38:27.578149+00	2026-04-19 11:38:27.57815+00	f
FLT-003	Mann CU 2545 salon filtri	56d6c342-4f3e-4622-a6b4-7001d5b7ff12	41fc653b-d53b-4d06-915e-dcbeefddd2f2	Mann CU 2545 salon filtri — sifatli mahsulot	\N	\N	\N	\N	t	530abdab-0058-4f92-a45a-ac9a27ee5c69	2026-04-19 11:38:27.581079+00	2026-04-19 11:38:27.581081+00	f
FLT-004	Bosch yoqilgi filtri	56d6c342-4f3e-4622-a6b4-7001d5b7ff12	c694e994-e836-4fea-938f-5945efdb6f3a	Bosch yoqilgi filtri — sifatli mahsulot	\N	\N	\N	\N	t	4a43b6d9-8297-49ea-ae28-e9918e42215b	2026-04-19 11:38:27.583909+00	2026-04-19 11:38:27.58391+00	f
FLT-005	Mann W 610/3 moy filtri	56d6c342-4f3e-4622-a6b4-7001d5b7ff12	41fc653b-d53b-4d06-915e-dcbeefddd2f2	Mann W 610/3 moy filtri — sifatli mahsulot	\N	\N	\N	\N	t	bb31a6ff-de00-4a2c-9d9c-7f69d8a3a443	2026-04-19 11:38:27.586762+00	2026-04-19 11:38:27.586763+00	f
TRM-001	TRW tormoz kolodkasi old	7435ec34-0626-4ee0-8495-63a8ff2312bc	fa870a64-46f2-4507-8da7-b09b1c8956a5	TRW tormoz kolodkasi old — sifatli mahsulot	\N	\N	\N	\N	t	e9770a6c-295c-40ba-8a63-a4e9ed876093	2026-04-19 11:38:27.589641+00	2026-04-19 11:38:27.589642+00	f
TRM-002	TRW tormoz kolodkasi orqa	7435ec34-0626-4ee0-8495-63a8ff2312bc	fa870a64-46f2-4507-8da7-b09b1c8956a5	TRW tormoz kolodkasi orqa — sifatli mahsulot	\N	\N	\N	\N	t	1c24cbe0-c149-4dc9-9445-9725cd3aeb87	2026-04-19 11:38:27.592149+00	2026-04-19 11:38:27.592151+00	f
TRM-003	Bosch tormoz diski	7435ec34-0626-4ee0-8495-63a8ff2312bc	c694e994-e836-4fea-938f-5945efdb6f3a	Bosch tormoz diski — sifatli mahsulot	\N	\N	\N	\N	t	b939e2ca-f55f-4408-bf02-4abda2b0ee67	2026-04-19 11:38:27.594989+00	2026-04-19 11:38:27.594991+00	f
TRM-004	TRW tormoz suyuqligi DOT4	7435ec34-0626-4ee0-8495-63a8ff2312bc	fa870a64-46f2-4507-8da7-b09b1c8956a5	TRW tormoz suyuqligi DOT4 — sifatli mahsulot	\N	\N	\N	\N	t	9a1a5faf-55d5-4cdc-b616-3217e92196b8	2026-04-19 11:38:27.597497+00	2026-04-19 11:38:27.597498+00	f
TRM-005	Bosch tormoz kolodkasi	7435ec34-0626-4ee0-8495-63a8ff2312bc	c694e994-e836-4fea-938f-5945efdb6f3a	Bosch tormoz kolodkasi — sifatli mahsulot	\N	\N	\N	\N	t	0a0f6405-a3c4-4407-8971-650cc659601e	2026-04-19 11:38:27.600041+00	2026-04-19 11:38:27.600042+00	f
AKK-001	Varta Blue Dynamic 60Ah	e276ecd1-dddb-40d9-b73e-c8946d480391	cb969556-b1ca-4087-82bb-fab7b2f0a58a	Varta Blue Dynamic 60Ah — sifatli mahsulot	\N	\N	\N	\N	t	129a99e4-dca3-4c2e-bfcf-4afe4f542ad9	2026-04-19 11:38:27.602627+00	2026-04-19 11:38:27.602629+00	f
AKK-002	Bosch S4 005 60Ah	e276ecd1-dddb-40d9-b73e-c8946d480391	c694e994-e836-4fea-938f-5945efdb6f3a	Bosch S4 005 60Ah — sifatli mahsulot	\N	\N	\N	\N	t	c228239d-d1c4-4236-9cb9-e7808189383a	2026-04-19 11:38:27.605648+00	2026-04-19 11:38:27.605649+00	f
AKK-003	Varta Silver Dynamic 74Ah	e276ecd1-dddb-40d9-b73e-c8946d480391	cb969556-b1ca-4087-82bb-fab7b2f0a58a	Varta Silver Dynamic 74Ah — sifatli mahsulot	\N	\N	\N	\N	t	1066d388-e709-43ed-b042-83a335050668	2026-04-19 11:38:27.608403+00	2026-04-19 11:38:27.608405+00	f
ELK-001	Denso generator	4550b3ae-fdfb-4c8d-b7a7-e35bd5919794	8f0d953f-8649-4519-a1b1-9cb887ad2fba	Denso generator — sifatli mahsulot	\N	\N	\N	\N	t	48ce2bbb-fd52-4167-9571-8ad49e68e387	2026-04-19 11:38:27.611611+00	2026-04-19 11:38:27.611612+00	f
ELK-002	Bosch starter	4550b3ae-fdfb-4c8d-b7a7-e35bd5919794	c694e994-e836-4fea-938f-5945efdb6f3a	Bosch starter — sifatli mahsulot	\N	\N	\N	\N	t	4be36249-0483-4ced-b090-d106e4872a29	2026-04-19 11:38:27.614484+00	2026-04-19 11:38:27.614486+00	f
ELK-003	Denso sham (4 dona)	4550b3ae-fdfb-4c8d-b7a7-e35bd5919794	8f0d953f-8649-4519-a1b1-9cb887ad2fba	Denso sham (4 dona) — sifatli mahsulot	\N	\N	\N	\N	t	bac0c541-2558-4028-95f9-ce9437679068	2026-04-19 11:38:27.617357+00	2026-04-19 11:38:27.617358+00	f
SOV-001	Bosch radiator	755ace90-6cbf-4042-afa4-6e34d825e328	c694e994-e836-4fea-938f-5945efdb6f3a	Bosch radiator — sifatli mahsulot	\N	\N	\N	\N	t	a93e0f52-1e0d-4419-a54a-b54632bc5051	2026-04-19 11:38:27.620117+00	2026-04-19 11:38:27.620118+00	f
SOV-002	Mann antifreez 5L	755ace90-6cbf-4042-afa4-6e34d825e328	41fc653b-d53b-4d06-915e-dcbeefddd2f2	Mann antifreez 5L — sifatli mahsulot	\N	\N	\N	\N	t	0d0d8217-4f19-4c45-af04-3a77af819c4e	2026-04-19 11:38:27.623097+00	2026-04-19 11:38:27.623099+00	f
SOV-003	Denso suv nasosi	755ace90-6cbf-4042-afa4-6e34d825e328	8f0d953f-8649-4519-a1b1-9cb887ad2fba	Denso suv nasosi — sifatli mahsulot	\N	\N	\N	\N	t	5565cf7a-a347-47c5-9047-a3174784343c	2026-04-19 11:38:27.625899+00	2026-04-19 11:38:27.625901+00	f
SOV-004	Bosch termostat	755ace90-6cbf-4042-afa4-6e34d825e328	c694e994-e836-4fea-938f-5945efdb6f3a	Bosch termostat — sifatli mahsulot	\N	\N	\N	\N	t	27cc1344-17c8-434e-88a8-ffb3e298d564	2026-04-19 11:38:27.628944+00	2026-04-19 11:38:27.628945+00	f
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (booking_id, amount, method, status, gateway_txn_id, gateway_response, paid_at, id, created_at, updated_at, is_deleted) FROM stdin;
83d15dea-7774-4ad2-8211-f4d8fd59a644	150000.00	CASH	SUCCESS	\N	\N	2026-04-07 06:38:27.127919+00	61188700-f8f4-43b9-b1c3-743dd1063e45	2026-04-19 11:38:27.478826+00	2026-04-19 11:38:27.47883+00	f
76a39bdf-8d33-400d-b131-a81b3becaa58	80000.00	CASH	SUCCESS	\N	\N	2026-03-25 05:38:27.127919+00	18d3e282-58ac-4783-8044-63d5d43befd8	2026-04-19 11:38:27.48044+00	2026-04-19 11:38:27.480441+00	f
bfb3a97f-8ca1-4f45-9882-d80e777ac2bc	450000.00	CARD	SUCCESS	\N	\N	2026-03-07 12:38:27.127919+00	4163dce2-46a6-4521-867b-c7bfa3a96f63	2026-04-19 11:38:27.481463+00	2026-04-19 11:38:27.481465+00	f
76aeebf9-a491-4509-af05-3980271f4aa4	250000.00	CASH	SUCCESS	\N	\N	2026-04-06 07:38:27.127919+00	70b92271-f79f-4cc1-9bd0-f3e1e72e7c29	2026-04-19 11:38:27.4824+00	2026-04-19 11:38:27.482402+00	f
b51bc8dc-a8e1-43f3-82a0-86943ef346e4	450000.00	CASH	SUCCESS	\N	\N	2026-03-23 05:38:27.127919+00	e7e2a3b1-301e-4c31-b86f-29154c117260	2026-04-19 11:38:27.48335+00	2026-04-19 11:38:27.483352+00	f
0aa55171-30b2-4255-a398-276d90e09ba4	150000.00	CASH	SUCCESS	\N	\N	2026-04-17 07:38:27.127919+00	36250c7f-691c-43b2-ac25-2b1dd7f60c2c	2026-04-19 11:38:27.4842+00	2026-04-19 11:38:27.484202+00	f
d25d3a36-8222-47f7-8496-e62b206c61bc	120000.00	CASH	SUCCESS	\N	\N	2026-03-10 11:38:27.127919+00	dea0b775-8bd0-4da7-bdff-d00ceeff874f	2026-04-19 11:38:27.48511+00	2026-04-19 11:38:27.485112+00	f
bd1d318e-34ba-4277-9116-e12470d6d33d	250000.00	CARD	SUCCESS	\N	\N	2026-03-13 07:38:27.127919+00	f965a068-7e26-449c-92b7-32ca811372d2	2026-04-19 11:38:27.485949+00	2026-04-19 11:38:27.485951+00	f
77762477-8d83-4192-99b0-07c95c806665	150000.00	CARD	SUCCESS	\N	\N	2026-03-20 11:38:27.127919+00	f672d208-7932-49bf-aa01-f847ef91dc87	2026-04-19 11:38:27.486883+00	2026-04-19 11:38:27.486884+00	f
1668183e-244f-4987-9d9b-5b995c2b78fa	150000.00	CARD	SUCCESS	\N	\N	2026-04-21 12:38:27.127919+00	daccffa1-6d6a-4ee7-b7ab-a6797d13a344	2026-04-19 11:38:27.487733+00	2026-04-19 11:38:27.487735+00	f
a068b534-7b60-4c4d-9d4d-3023c11ea78b	150000.00	CARD	SUCCESS	\N	\N	2026-03-24 07:38:27.127919+00	53cbbeae-27ed-46ef-845d-34d2db9573c4	2026-04-19 11:38:27.488626+00	2026-04-19 11:38:27.488627+00	f
757f6ae4-4f5c-4e42-85e5-bea976e3e300	80000.00	CARD	SUCCESS	\N	\N	2026-03-24 08:38:27.127919+00	d8e93f4c-0762-41f8-afec-6fc9a7c128c4	2026-04-19 11:38:27.489443+00	2026-04-19 11:38:27.489444+00	f
d64dff8b-e8c3-4d36-948a-e65b71b5ec4a	160000.00	CASH	PENDING	\N	\N	\N	3062dccb-e4fd-4916-b345-816a234998e2	2026-04-21 06:53:03.557455+00	2026-04-21 06:53:03.557458+00	f
\.


--
-- Data for Name: payouts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payouts (workshop_id, amount, status, bank_account, processed_at, id, created_at, updated_at, is_deleted) FROM stdin;
\.


--
-- Data for Name: platform_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.platform_settings (key, value, description, category, updated_by, id, created_at, updated_at, is_deleted) FROM stdin;
commission_percent	10	Platforma komissiya foizi	payment	\N	b4d2a0ef-0f69-4e90-97bd-edbe357a0cb3	2026-04-19 11:38:00.474167+00	2026-04-19 11:38:00.47417+00	f
warranty_default_months	3	Kafolat muddati (oy)	warranty	\N	7d43eb3a-afaf-4c18-8d6a-f6aa9b9ab9ac	2026-04-19 11:38:00.474171+00	2026-04-19 11:38:00.474172+00	f
max_file_size_mb	10	Max fayl hajmi (MB)	general	\N	3a6dff92-d35a-4b74-9f1a-d71b7177102b	2026-04-19 11:38:00.474172+00	2026-04-19 11:38:00.474173+00	f
booking_cancel_hours	2	Bekor qilish muddati (soat)	booking	\N	9112f74e-4d89-4938-92d6-005ea3b1fd0f	2026-04-19 11:38:00.474173+00	2026-04-19 11:38:00.474173+00	f
otp_expire_minutes	5	OTP muddati (daqiqa)	security	\N	4cfe6d21-af8a-4684-97fe-76c209a0d574	2026-04-19 11:38:00.474174+00	2026-04-19 11:38:00.474174+00	f
max_daily_bookings	50	Kunlik max buyurtmalar	booking	\N	dd7ee62b-745c-49e7-bff0-2e9dfe6658e1	2026-04-19 11:38:27.698988+00	2026-04-19 11:38:27.69899+00	f
min_withdrawal_amount	100000	Min pul yechish	payment	\N	64c673e3-a40b-422b-9abb-4244f21d619a	2026-04-19 11:38:27.700048+00	2026-04-19 11:38:27.700049+00	f
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (user_id, token_hash, expires_at, device_info, id, created_at, updated_at, is_deleted) FROM stdin;
a82e28be-46c0-40e1-995d-bee60803d783	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhODJlMjhiZS00NmMwLTQwZTEtOTk1ZC1iZWU2MDgwM2Q3ODMiLCJleHAiOjE3NzkxOTA3OTAsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiZDFiN2Y2ZGJhYWUwYmE1NjIzZDgxZjM0YTg1Zjg2YzAifQ.oTfGfrP3bXHtrEdvq-Vffp7Pwpfp4ZNMS-xl5rY5KQA	2026-05-19 11:39:50.975243+00	\N	179da362-d0e2-44e9-aadd-7d9624610753	2026-04-19 11:39:50.975776+00	2026-04-19 11:39:50.975777+00	f
9e1e6568-546b-46a7-93c1-3634b2896dff	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ZTFlNjU2OC01NDZiLTQ2YTctOTNjMS0zNjM0YjI4OTZkZmYiLCJleHAiOjE3NzkxOTA4MjgsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiNGM4M2RlNjU1NWRmNTcwNzQwMTdlYmMwNjEyZTFkMzgifQ.EEo2g9tJqEo9_7d6In_dmJY5iRzP-jMY_yCeTZFzT54	2026-05-19 11:40:28.288187+00	\N	bd3e8eb0-4b43-4c98-8947-d133f4c95fdb	2026-04-19 11:40:28.288419+00	2026-04-19 11:40:28.28842+00	f
9e1e6568-546b-46a7-93c1-3634b2896dff	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ZTFlNjU2OC01NDZiLTQ2YTctOTNjMS0zNjM0YjI4OTZkZmYiLCJleHAiOjE3NzkxOTM0MzMsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiOWY5YjM4YmE4M2VhNDI5NDUyYzFjZDNlNGU2Yjk5MjIifQ.1gRLpLNfrbTNF7ipTflSpr4Jbgf4LtlpuqzpWHbYtu4	2026-05-19 12:23:53.774798+00	\N	4bde8333-0035-4c9c-ac6c-66945767ab17	2026-04-19 12:23:53.775581+00	2026-04-19 12:23:53.775583+00	f
a82e28be-46c0-40e1-995d-bee60803d783	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhODJlMjhiZS00NmMwLTQwZTEtOTk1ZC1iZWU2MDgwM2Q3ODMiLCJleHAiOjE3NzkxOTM2MjMsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiZDE5YWQ2ZTY5ZjI3OWEyYTBlMDEwMmQ3MjRjODE3ZmEifQ.A1JOCvwm4FSQzdhFU2ygM3J5mI5CV4Mw9vIMkEndPOY	2026-05-19 12:27:03.267453+00	\N	b9030474-a521-4728-85ba-2e6b1f1553ae	2026-04-19 12:27:03.267694+00	2026-04-20 05:05:01.27567+00	t
9e1e6568-546b-46a7-93c1-3634b2896dff	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ZTFlNjU2OC01NDZiLTQ2YTctOTNjMS0zNjM0YjI4OTZkZmYiLCJleHAiOjE3NzkxOTM3NjcsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiNmVmN2NjN2U1ZmZlZjMzOTIyODE2YjhkMTI0MjU4ZmUifQ.e2FljdL1T1dvXJhZikJk1PmZctmtV7YwNjvcgZKkv90	2026-05-19 12:29:27.608002+00	\N	dd497274-1c95-4381-9cc8-f39d7bb07912	2026-04-19 12:29:27.60836+00	2026-04-20 05:20:04.502441+00	t
a82e28be-46c0-40e1-995d-bee60803d783	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhODJlMjhiZS00NmMwLTQwZTEtOTk1ZC1iZWU2MDgwM2Q3ODMiLCJleHAiOjE3NzkyNTM1MDEsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiZGNkODYzYmI2Yjc3ZjgwYzhjMzMzMDE0OTM1YTk5NGYifQ.zSFyiaPY_ED7Zgmta77xRESgdzIGhjU2kJA3Cf8jWko	2026-05-20 05:05:01.283551+00	\N	1745136c-02a0-4c53-b5b1-e5592a2741ed	2026-04-20 05:05:01.285603+00	2026-04-20 12:00:17.721077+00	t
6d6c1e4a-f037-4866-97aa-8fbd9142b835	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDZjMWU0YS1mMDM3LTQ4NjYtOTdhYS04ZmJkOTE0MmI4MzUiLCJleHAiOjE3NzkyNjA2MzcsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiMDliN2ExZmNhZjkwMjk5NDAxNDc2NTYwZjhkOTVkMTkifQ.paoqhjyxPM2kbhvCv384I8PfsOI-4PLIMJu3iAyA88Y	2026-05-20 07:03:57.982378+00	\N	7e691fbb-d731-4828-bfce-c7c809e224e8	2026-04-20 07:03:57.983608+00	2026-04-20 07:03:57.983616+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDZjMWU0YS1mMDM3LTQ4NjYtOTdhYS04ZmJkOTE0MmI4MzUiLCJleHAiOjE3NzkxOTA5MTgsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiMzlhOTM3NTViMGMzZjMxMTRiZmM2MzYzN2Y2NWMxNjUifQ.z8jBLY6aoA78NfYMX3wtwjYtMSmo6IXef5omroKd3d0	2026-05-19 11:41:58.89739+00	\N	6806cebe-7526-4c51-a832-6b48b2f79559	2026-04-19 11:41:58.897609+00	2026-04-20 07:03:57.978527+00	t
6d6c1e4a-f037-4866-97aa-8fbd9142b835	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDZjMWU0YS1mMDM3LTQ4NjYtOTdhYS04ZmJkOTE0MmI4MzUiLCJleHAiOjE3NzkyNzg0MDgsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiMzMyNzU0NWY1ZTkwZDQyYzMyNDExNGE0NjFhNzJmM2QifQ.8ZUF8qEBoprRw2kvWoc34409weihuTOKhTSD1OjkLUs	2026-05-20 12:00:08.640435+00	\N	2f28e1ef-8045-4724-9ddb-7d20911545a6	2026-04-20 12:00:08.642566+00	2026-04-20 12:00:08.642568+00	f
a82e28be-46c0-40e1-995d-bee60803d783	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhODJlMjhiZS00NmMwLTQwZTEtOTk1ZC1iZWU2MDgwM2Q3ODMiLCJleHAiOjE3NzkyNzg0MTcsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiNjdjMzI2NzA3ZTk2MDYxYTkwMTNlNmQ0ODg5ZTYzY2YifQ.vcvS3aq6hHWnQkd-d3GDdPYgqGjTBzyYU28ed0Ejxz0	2026-05-20 12:00:17.722816+00	\N	ae8096b6-6a45-4b18-8be7-6ce7c252c176	2026-04-20 12:00:17.72302+00	2026-04-20 12:00:17.827535+00	t
6d6c1e4a-f037-4866-97aa-8fbd9142b835	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDZjMWU0YS1mMDM3LTQ4NjYtOTdhYS04ZmJkOTE0MmI4MzUiLCJleHAiOjE3NzkyNzg0MDgsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiOWU5ZGRmMzY4YzA0OTc1NDJiMzYzNDVkZmZiZWRhN2UifQ._zANhCLHaMjrHaUNi4yJ-rlMjvfbRPmat8hWoYf1bKc	2026-05-20 12:00:08.652788+00	\N	6ffe6d27-b9f3-4692-9fb2-6126795f98d4	2026-04-20 12:00:08.653007+00	2026-04-20 12:00:08.653009+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDZjMWU0YS1mMDM3LTQ4NjYtOTdhYS04ZmJkOTE0MmI4MzUiLCJleHAiOjE3NzkyNzg0MDgsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiZjk5NWM4ZDkxNDZjZTkxMmI1ZGRlMDVjYzllMGYzMjkifQ.UZ8I26rmRiJz0bGNc3Kw5yR1y722G7HxY6azPsQsE9o	2026-05-20 12:00:08.667121+00	\N	720e9c53-9e20-4d1e-b9a2-bb5b1ca46eb4	2026-04-20 12:00:08.66747+00	2026-04-20 12:00:08.667472+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDZjMWU0YS1mMDM3LTQ4NjYtOTdhYS04ZmJkOTE0MmI4MzUiLCJleHAiOjE3NzkyNjA2MzcsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiMDAwMGYwMDkzYjg2ZTVjNTcyMzFhZjdjNGE3ZTdjODQifQ.nftfdorGD1OL2FRQVYjiH4FE4MXuaUVzJu4TJ3j-75M	2026-05-20 07:03:57.990915+00	\N	79d9dbd5-5dde-4371-9265-7e24e41f9353	2026-04-20 07:03:57.991119+00	2026-04-20 12:00:08.637254+00	t
6d6c1e4a-f037-4866-97aa-8fbd9142b835	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDZjMWU0YS1mMDM3LTQ4NjYtOTdhYS04ZmJkOTE0MmI4MzUiLCJleHAiOjE3NzkyNzg0MDgsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiY2E5MzMzNWIzNDZmNjFlOTJmMGIwZWFhMWZiMTFmMjcifQ.BkybZxTcm3Duy3cG1olRj12Ksjo4afH2X-JwtG2Fe8Y	2026-05-20 12:00:08.6747+00	\N	a7d78c14-f8e4-455e-a913-f629b30a6809	2026-04-20 12:00:08.674935+00	2026-04-20 16:11:35.417717+00	t
a82e28be-46c0-40e1-995d-bee60803d783	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhODJlMjhiZS00NmMwLTQwZTEtOTk1ZC1iZWU2MDgwM2Q3ODMiLCJleHAiOjE3NzkyNzg0MTcsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiMzFmNWZkYmU3M2IzNDkzNDc1NjU5M2Q2ZWNkYzlhODgifQ.T8RfiiovNLaNP83TVwq_Pvy5GVBikk1Mt9wNapX3Qpc	2026-05-20 12:00:17.849652+00	\N	32eff319-74be-4bbb-a038-2df5d5a23c74	2026-04-20 12:00:17.849886+00	2026-04-21 06:43:56.765851+00	t
a82e28be-46c0-40e1-995d-bee60803d783	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhODJlMjhiZS00NmMwLTQwZTEtOTk1ZC1iZWU2MDgwM2Q3ODMiLCJleHAiOjE3NzkzNDU4MzYsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiYjg1ZjYzMjVmYTQ0MjI0ZDE3Mjc4YzhkOTQ1YTFiZDIifQ.4JB6W-ziNbJGtTpQGZ88Qc0UEomO4K5V2DBAjFQ3n-U	2026-05-21 06:43:56.770762+00	\N	e233c5e7-7203-4b88-a6f5-9949e3594a74	2026-04-21 06:43:56.771596+00	2026-04-21 06:43:56.771597+00	f
9e1e6568-546b-46a7-93c1-3634b2896dff	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ZTFlNjU2OC01NDZiLTQ2YTctOTNjMS0zNjM0YjI4OTZkZmYiLCJleHAiOjE3NzkyNTQ0MDQsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiMTlhOTVlYWI5ODE3NzBjYWRhYTEyNzY1MTA2ZGNlMzMifQ.VwlWSN7WIgftMuOVfaj976Qm0rLE0DiqdSa0jFH6Jjc	2026-05-20 05:20:04.503834+00	\N	20f1c3be-2995-4d04-aff7-388ce3919f93	2026-04-20 05:20:04.504112+00	2026-04-21 06:43:59.897348+00	t
9e1e6568-546b-46a7-93c1-3634b2896dff	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ZTFlNjU2OC01NDZiLTQ2YTctOTNjMS0zNjM0YjI4OTZkZmYiLCJleHAiOjE3NzkzNDU4MzksInR5cGUiOiJyZWZyZXNoIiwianRpIjoiZDIwM2QxYThmZjMyZjhjNzBkN2FiNTk3NDU0OTdlY2MifQ.OWrKmHXEROzh_zO86wHc1LocpxhxgciFoO1Ak0nUXfU	2026-05-21 06:43:59.899059+00	\N	4b70514a-53a8-48a7-8827-6c2ef9523803	2026-04-21 06:43:59.899288+00	2026-04-21 06:43:59.899289+00	f
a82e28be-46c0-40e1-995d-bee60803d783	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhODJlMjhiZS00NmMwLTQwZTEtOTk1ZC1iZWU2MDgwM2Q3ODMiLCJleHAiOjE3NzkzNDU4NTgsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiODZmYWUyNDgxMzRiYjhlZjQ0YzBjYjM2NmJiNzE0MDkifQ.Yu-T0_7oCnixsN4DCOBkPX47LPLAUNy9pdfvpdoNP6A	2026-05-21 06:44:18.962996+00	\N	92f96764-4771-481d-9a14-8d3eef3561f9	2026-04-21 06:44:18.96324+00	2026-04-21 06:44:18.963241+00	f
9e1e6568-546b-46a7-93c1-3634b2896dff	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ZTFlNjU2OC01NDZiLTQ2YTctOTNjMS0zNjM0YjI4OTZkZmYiLCJleHAiOjE3NzkzNDY0NjMsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiOWQyMzY0NzE5MmI0NDJmZTY3ZDg1YjJkZmM3YWRmM2IifQ.6HCA6eyerH3Oq1XWLAjbc67i0WTHdkgWW5IJTJH9sPs	2026-05-21 06:54:23.340034+00	\N	b3109ecb-b4ad-486c-930c-fd4def8999f7	2026-04-21 06:54:23.340252+00	2026-04-21 06:54:23.340252+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDZjMWU0YS1mMDM3LTQ4NjYtOTdhYS04ZmJkOTE0MmI4MzUiLCJleHAiOjE3NzkzNDY5NDcsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiZTFhOTY5NjJkNTkxZWM2MmM4NDFkOTM2MDc4N2E3NDkifQ.L3fNMT7EDX6N-m4B6Dn0xF-Kiz3wStfQNGr2UUrS9lM	2026-05-21 07:02:27.782452+00	\N	5af75276-b522-4165-b5f1-62f5a271a5c9	2026-04-21 07:02:27.782671+00	2026-04-21 07:02:27.782672+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDZjMWU0YS1mMDM3LTQ4NjYtOTdhYS04ZmJkOTE0MmI4MzUiLCJleHAiOjE3NzkyOTM0OTUsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiOGU1ZThhMWEzMGUzYjM0YTU4OTY4YzhmNTkzMjhmY2YifQ.S7jN1zMBxWBWkBlt2ZSQVbZ4p8q2_2BWTo6psUAS_x0	2026-05-20 16:11:35.455689+00	\N	00eae1ef-b624-4378-9303-e29c90a45890	2026-04-20 16:11:35.457775+00	2026-04-21 07:51:23.870599+00	t
9e1e6568-546b-46a7-93c1-3634b2896dff	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ZTFlNjU2OC01NDZiLTQ2YTctOTNjMS0zNjM0YjI4OTZkZmYiLCJleHAiOjE3NzkzNDc1NzQsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiODkwMWUwNDQ1YWQ0NDg4NzViMTU5MzRlNGMzYmQyZjIifQ.svgxj8rV1k1nxqmZEdNnIvS2M4lpLkJb07j1yItwfD8	2026-05-21 07:12:54.027509+00	\N	e8fe91e6-44c6-421e-9124-61564a10d00e	2026-04-21 07:12:54.027809+00	2026-04-21 07:12:54.02781+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDZjMWU0YS1mMDM3LTQ4NjYtOTdhYS04ZmJkOTE0MmI4MzUiLCJleHAiOjE3NzkzNDc2MDAsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiM2FhN2ZhOGY1MGYwZDI5NTI4YzcxZjlhOTQ4NjA0NGIifQ.MNx7o63k6vdGOAee5mvNCrWOT_ydgXHqWgOl8qUL3g0	2026-05-21 07:13:20.237459+00	\N	c0c2a0b5-62ce-4f12-9384-56b9029f5ded	2026-04-21 07:13:20.23767+00	2026-04-21 07:13:20.23767+00	f
598064b4-21d2-404a-bcd8-afcb98d07e62	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1OTgwNjRiNC0yMWQyLTQwNGEtYmNkOC1hZmNiOThkMDdlNjIiLCJleHAiOjE3NzkzNDc5NDMsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiOTI3OTU2NjQyMDNjODU2ZWE2Njk5YzBmOWRlN2IxZDAifQ.ReVgShGOQw9PSTXxqPujbpWkagh2Etgopjuh_eF3nhE	2026-05-21 07:19:03.415887+00	\N	baf098a6-88da-447a-ad10-572a6ddbc5cc	2026-04-21 07:19:03.416067+00	2026-04-21 07:19:03.416067+00	f
9e1e6568-546b-46a7-93c1-3634b2896dff	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ZTFlNjU2OC01NDZiLTQ2YTctOTNjMS0zNjM0YjI4OTZkZmYiLCJleHAiOjE3NzkzNDgwNDYsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiYWNmMDViZWI4ODViYTQxODA1N2E2MjAwZGM5NzRiMjgifQ.EYbq_hou7swwDCF-IRUC1q9tYqaQL3I4KCjB3RHosck	2026-05-21 07:20:46.410025+00	\N	a10baa08-56dc-4902-bf35-e95f2d79d364	2026-04-21 07:20:46.410284+00	2026-04-21 07:20:46.410285+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDZjMWU0YS1mMDM3LTQ4NjYtOTdhYS04ZmJkOTE0MmI4MzUiLCJleHAiOjE3NzkzNDc5ODQsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiYWIzYjllNThhZjQxOGMyNGJiOWQ5ODE3NDNjYzI5YjUifQ.p1wgQgHv-onmH6WkKgqm4DFp7es3w0Rl7QCCiwa6K9Y	2026-05-21 07:19:44.583966+00	\N	2e4b1a37-cb3a-49fe-9a6a-84fa36d4f865	2026-04-21 07:19:44.584212+00	2026-04-21 07:19:44.584212+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDZjMWU0YS1mMDM3LTQ4NjYtOTdhYS04ZmJkOTE0MmI4MzUiLCJleHAiOjE3NzkzNDk4ODMsInR5cGUiOiJyZWZyZXNoIiwianRpIjoiZWUxOGIyOGNkZTBiM2U5YThlOTI2YjRjMTVjZTBmNmEifQ.D9tU1myJzxI1IzVlHxzKQdG7HYSvV-ctAs4hT1OjLK0	2026-05-21 07:51:23.872402+00	\N	35bc84d7-3ce8-4ac3-843f-87799dbae861	2026-04-21 07:51:23.872694+00	2026-04-21 07:51:23.872696+00	f
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reviews (booking_id, customer_id, workshop_id, rating_quality, rating_price, rating_time, rating_communication, rating_overall, comment, photos, reply, is_visible, id, created_at, updated_at, is_deleted) FROM stdin;
83d15dea-7774-4ad2-8211-f4d8fd59a644	49354f6b-ef90-4176-897d-ceaf428d76f2	f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	3	5	3	3	3.5	Juda yaxshi xizmat! Tez va sifatli bajarildi.	\N	\N	t	b03f33d9-3da1-4fea-ac76-d6e40325fb50	2026-04-19 11:38:27.495686+00	2026-04-19 11:38:27.495689+00	f
76a39bdf-8d33-400d-b131-a81b3becaa58	960d13c2-aa57-48f6-87d6-3ce926e384ea	ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	4	5	3	4	4	Narxi adolatli, tavsiya qilaman.	\N	Rahmat! Sizni yana kutamiz.	t	2884b4c2-60d4-4f5f-8bd9-8c13a4db9453	2026-04-19 11:38:27.497427+00	2026-04-19 11:38:27.497429+00	f
bfb3a97f-8ca1-4f45-9882-d80e777ac2bc	49354f6b-ef90-4176-897d-ceaf428d76f2	a0cc3386-af63-4387-b8ad-7686da70cd9e	4	5	4	4	4.2	Usta professional, lekin biroz kechikdi.	\N	Kechikish uchun uzr, keyingi safar tezroq xizmat ko'rsatamiz.	t	aa1e3083-3c92-4bf6-a871-160c722289f5	2026-04-19 11:38:27.498544+00	2026-04-19 11:38:27.498545+00	f
76aeebf9-a491-4509-af05-3980271f4aa4	79c4fb59-5ea6-4406-b403-8a37b0ec3d22	5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	4	5	4	3	4	Zo'r! Mashinam yangiday bo'ldi.	\N	\N	t	d0c94c8e-faaf-42aa-9b6c-4a8a6af59dd4	2026-04-19 11:38:27.499547+00	2026-04-19 11:38:27.499549+00	f
b51bc8dc-a8e1-43f3-82a0-86943ef346e4	960d13c2-aa57-48f6-87d6-3ce926e384ea	b7baeea9-fc4d-4cf9-a469-4916155f40bc	4	3	5	3	3.8	Xizmat sifati yaxshi, tozaroq bo'lsa yaxshi.	\N	\N	t	8a25cebe-c690-4a82-9d95-f36acef552c7	2026-04-19 11:38:27.500551+00	2026-04-19 11:38:27.500552+00	f
0aa55171-30b2-4255-a398-276d90e09ba4	960d13c2-aa57-48f6-87d6-3ce926e384ea	ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	5	3	4	5	4.2	Professional yondashuv, kafolatli ish.	\N	Rahmat! Sizni yana kutamiz.	t	0ec76a7f-03f1-4020-bb75-f009c52fc710	2026-04-19 11:38:27.501536+00	2026-04-19 11:38:27.501538+00	f
d25d3a36-8222-47f7-8496-e62b206c61bc	a82e28be-46c0-40e1-995d-bee60803d783	b7baeea9-fc4d-4cf9-a469-4916155f40bc	3	5	3	4	3.8	Diagnostika aniq, muammo tez aniqlandi.	\N	\N	t	d9623048-ca9a-4034-ab54-8bc984bf8e7d	2026-04-19 11:38:27.502494+00	2026-04-19 11:38:27.502495+00	f
bd1d318e-34ba-4277-9116-e12470d6d33d	960d13c2-aa57-48f6-87d6-3ce926e384ea	a0cc3386-af63-4387-b8ad-7686da70cd9e	4	3	4	4	3.8	Konditsioner zo'r ishlayapti, rahmat!	\N	\N	t	b69585fa-15d3-4464-8ef4-55a8ea454678	2026-04-19 11:38:27.503326+00	2026-04-19 11:38:27.503328+00	f
77762477-8d83-4192-99b0-07c95c806665	79c4fb59-5ea6-4406-b403-8a37b0ec3d22	d0157137-b945-482c-aad0-f5b7f57044af	5	3	5	3	4	Narxi biroz yuqori lekin sifatli.	\N	Kechikish uchun uzr, keyingi safar tezroq xizmat ko'rsatamiz.	t	47f7b850-4401-4fa6-aeec-69040d7a708a	2026-04-19 11:38:27.504195+00	2026-04-19 11:38:27.504196+00	f
1668183e-244f-4987-9d9b-5b995c2b78fa	a82e28be-46c0-40e1-995d-bee60803d783	42a94963-592f-48d2-8bde-83ce8a2d786f	4	5	5	4	4.5	Tez bajarildi, vaqtimni tejadi.	\N	\N	t	8805c5d2-5591-450a-b876-017f5beecc72	2026-04-19 11:38:27.505085+00	2026-04-19 11:38:27.505086+00	f
a068b534-7b60-4c4d-9d4d-3023c11ea78b	79c4fb59-5ea6-4406-b403-8a37b0ec3d22	eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	3	4	3	4	3.5	Yaxshi usta, lekin navbat ko'p.	\N	\N	t	f709dbda-5c69-4b5b-9435-50ce71139637	2026-04-19 11:38:27.50597+00	2026-04-19 11:38:27.505971+00	f
757f6ae4-4f5c-4e42-85e5-bea976e3e300	49354f6b-ef90-4176-897d-ceaf428d76f2	ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	4	4	5	4	4.2	Ajoyib xizmat, yana kelaman.	\N	Kechikish uchun uzr, keyingi safar tezroq xizmat ko'rsatamiz.	t	6e1ec0a4-28a1-4f0b-b695-85a40d91b09e	2026-04-19 11:38:27.506803+00	2026-04-19 11:38:27.506804+00	f
\.


--
-- Data for Name: service_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_categories (name, slug, icon_url, parent_id, "order", id, created_at, updated_at, is_deleted) FROM stdin;
Moy almashtirish	moy-almashtirish	\N	\N	1	05424e68-ff34-4835-b0f3-e163865432ea	2026-04-19 11:38:00.476045+00	2026-04-19 11:38:00.476047+00	f
Diagnostika	diagnostika	\N	\N	2	21d2d384-82a0-4e87-88a7-679897c19134	2026-04-19 11:38:00.476047+00	2026-04-19 11:38:00.476048+00	f
Tormoz tizimi	tormoz-tizimi	\N	\N	3	272b2116-c806-48ba-8695-a7adbf41ce6c	2026-04-19 11:38:00.476048+00	2026-04-19 11:38:00.476048+00	f
Shinalar	shinalar	\N	\N	4	7275c6a5-dd4a-4718-92e0-0bd6927fc961	2026-04-19 11:38:00.476049+00	2026-04-19 11:38:00.476049+00	f
Dvigatel ta'miri	dvigatel-tamiri	\N	\N	5	b96dffbb-8096-4a8c-89b0-32078d55f910	2026-04-19 11:38:00.476049+00	2026-04-19 11:38:00.47605+00	f
Elektrika	elektrika	\N	\N	6	6323d62e-1153-44ec-8c48-14465f6b4953	2026-04-19 11:38:00.47605+00	2026-04-19 11:38:00.47605+00	f
Kuzov ishlari	kuzov-ishlari	\N	\N	7	5a3ebf2c-098d-4aae-b7fb-db891557254d	2026-04-19 11:38:00.476051+00	2026-04-19 11:38:00.476051+00	f
Konditsioner	konditsioner	\N	\N	8	4814f621-988d-44cc-aaad-61b6ee90108a	2026-04-19 11:38:00.476051+00	2026-04-19 11:38:00.476052+00	f
Uzatmalar qutisi	uzatmalar	\N	\N	9	9cb43b98-8ceb-4b91-9c71-8d9c91cda475	2026-04-19 11:38:27.395733+00	2026-04-19 11:38:27.395735+00	f
Osma tizim	osma-tizim	\N	\N	10	cdf5864b-0609-4899-9053-4748b71639d7	2026-04-19 11:38:27.397012+00	2026-04-19 11:38:27.397013+00	f
Salon tozalash	salon-tozalash	\N	\N	11	76390c26-f12e-41a7-8291-0dfcd1152010	2026-04-19 11:38:27.397944+00	2026-04-19 11:38:27.397946+00	f
Texnik ko'rik	texnik-korik	\N	\N	12	ff92841b-50bd-4c99-bb98-74c7266b9d6b	2026-04-19 11:38:27.398833+00	2026-04-19 11:38:27.398835+00	f
\.


--
-- Data for Name: service_tags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_tags (name, id, created_at, updated_at, is_deleted) FROM stdin;
\.


--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscription_plans (tier, name, price_monthly, features, max_bookings_per_month, id, created_at, updated_at, is_deleted) FROM stdin;
basic	Asosiy	0.00	{}	50	bd526f22-2689-4d8d-b453-b3f272a6680b	2026-04-19 11:38:00.477587+00	2026-04-19 11:38:00.477589+00	f
silver	Kumush	299000.00	{"analytics": true}	150	501cc1be-0cfc-48bf-a0b4-0879479b53b9	2026-04-19 11:38:00.47759+00	2026-04-19 11:38:00.47759+00	f
gold	Oltin	599000.00	{"priority": true, "analytics": true}	500	f9f94396-5f8b-4cfd-b833-57d9950d98e5	2026-04-19 11:38:00.477591+00	2026-04-19 11:38:00.477591+00	f
platinum	Platinum	999000.00	{"support": true, "priority": true, "analytics": true, "max_photos": 50}	99999	f37909be-dc18-4300-9cf1-f2a1c15f2a48	2026-04-19 11:38:27.706248+00	2026-04-19 11:38:27.70625+00	f
\.


--
-- Data for Name: time_slots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.time_slots (workshop_id, date, "time", capacity, booked_count, is_available, id, created_at, updated_at, is_deleted) FROM stdin;
\.


--
-- Data for Name: user_vehicles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_vehicles (user_id, brand_id, model_id, year, license_plate, vin_code, color, mileage, id, created_at, updated_at, is_deleted) FROM stdin;
a82e28be-46c0-40e1-995d-bee60803d783	bd170d61-dbf1-4ae5-a9be-15e6a01ce4ff	0cfcf118-60fe-4c2a-97d5-618833c25650	2023	01A777AA	\N	Kumush	42499	f2cf9317-22bd-412d-8486-adc6d8f3342f	2026-04-19 11:38:27.378875+00	2026-04-19 11:38:27.378877+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	9c94b655-d714-4c38-b3f1-22f74df863f1	f6711596-8fef-471f-9d6d-2a17478efed3	2015	01B999BB	\N	Kumush	31868	e2fe458e-b039-43c9-a934-fdc28a68ff7c	2026-04-19 11:38:27.380797+00	2026-04-19 11:38:27.380798+00	f
960d13c2-aa57-48f6-87d6-3ce926e384ea	bd170d61-dbf1-4ae5-a9be-15e6a01ce4ff	bf78dafc-eac1-4ab7-aa20-c1157333a332	2020	01C123CD	\N	Qizil	17969	8ac93651-57eb-4338-b809-1a73c938de20	2026-04-19 11:38:27.380799+00	2026-04-19 11:38:27.3808+00	f
49354f6b-ef90-4176-897d-ceaf428d76f2	bd170d61-dbf1-4ae5-a9be-15e6a01ce4ff	0be7cee0-97f7-407d-9f06-533fc0ddbd8a	2022	01D456EF	\N	Kumush	86971	2f863265-6d05-4c2d-b435-77ccb215ba7f	2026-04-19 11:38:27.382322+00	2026-04-19 11:38:27.382324+00	f
49354f6b-ef90-4176-897d-ceaf428d76f2	bd170d61-dbf1-4ae5-a9be-15e6a01ce4ff	0cfcf118-60fe-4c2a-97d5-618833c25650	2024	01E789GH	\N	Kumush	21147	2e86b61f-5d40-446c-8986-db09778dee40	2026-04-19 11:38:27.382324+00	2026-04-19 11:38:27.382325+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	9c94b655-d714-4c38-b3f1-22f74df863f1	c9408c9a-452d-4663-b16c-493816d5a25d	2024	01F012IJ	\N	Qizil	101471	3441c9c7-3f1e-4002-b1ae-241bf44af3a4	2026-04-19 11:38:27.383484+00	2026-04-19 11:38:27.383486+00	f
79c4fb59-5ea6-4406-b403-8a37b0ec3d22	bd170d61-dbf1-4ae5-a9be-15e6a01ce4ff	bf78dafc-eac1-4ab7-aa20-c1157333a332	2021	01G345KL	\N	Qora	105776	ef11e6f1-0920-4e0b-8406-30f7e282e9d5	2026-04-19 11:38:27.383486+00	2026-04-19 11:38:27.383487+00	f
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (phone, email, full_name, role, is_active, is_verified, avatar_url, region, id, created_at, updated_at, is_deleted) FROM stdin;
+998901234567	\N	Super Admin	SUPER_ADMIN	t	t	\N	\N	6d6c1e4a-f037-4866-97aa-8fbd9142b835	2026-04-19 11:38:00.478927+00	2026-04-19 11:38:00.478929+00	f
+998903333333	\N	Toshkent Admin	REGIONAL_ADMIN	t	t	\N	Toshkent	06a0e51b-b136-4a77-bc70-6ad88d889f8c	2026-04-19 11:38:00.478929+00	2026-04-19 11:38:00.47893+00	f
+998904444444	\N	Moderator Anvar	MODERATOR	t	t	\N	\N	fc929e4a-10c4-4648-9328-2809ac78ef48	2026-04-19 11:38:00.47893+00	2026-04-19 11:38:00.47893+00	f
+998901111111	\N	Test Mijoz	CUSTOMER	t	t	\N	\N	a82e28be-46c0-40e1-995d-bee60803d783	2026-04-19 11:38:00.478931+00	2026-04-19 11:38:00.478931+00	f
+998902222222	\N	Test Ustaxona Egasi	PARTNER	t	t	\N	\N	9e1e6568-546b-46a7-93c1-3634b2896dff	2026-04-19 11:38:00.478931+00	2026-04-19 11:38:00.478932+00	f
+998903334444	\N	Xorazm Admin	REGIONAL_ADMIN	t	t	\N	Urganch	711f4c35-ccef-4b22-9be0-a0588e21e08b	2026-04-19 11:38:27.33835+00	2026-04-19 11:38:27.338352+00	f
+998901111222	\N	Dilshod Toshmatov	CUSTOMER	t	t	\N	\N	960d13c2-aa57-48f6-87d6-3ce926e384ea	2026-04-19 11:38:27.341+00	2026-04-19 11:38:27.341002+00	f
+998901111333	\N	Nodira Karimova	CUSTOMER	t	t	\N	\N	49354f6b-ef90-4176-897d-ceaf428d76f2	2026-04-19 11:38:27.34205+00	2026-04-19 11:38:27.342052+00	f
+998901111444	\N	Sardor Umarov	CUSTOMER	t	t	\N	\N	79c4fb59-5ea6-4406-b403-8a37b0ec3d22	2026-04-19 11:38:27.343263+00	2026-04-19 11:38:27.343266+00	f
+998902222333	\N	Bobur Servis	PARTNER	t	t	\N	\N	8485b3d5-3708-43ee-bef3-1595a49643c1	2026-04-19 11:38:27.344741+00	2026-04-19 11:38:27.344743+00	f
+998905555555	\N	asdasd	PARTNER	t	t	\N	\N	598064b4-21d2-404a-bcd8-afcb98d07e62	2026-04-21 07:19:03.414588+00	2026-04-21 07:19:07.2103+00	f
+998901234568	\N	Platform Admin	ADMIN	t	t	\N	\N	8f2e32d7-4455-4cc8-9780-7916eac70a88	2026-04-21 07:55:27.72961+00	2026-04-21 07:55:27.729613+00	f
\.


--
-- Data for Name: vehicle_brands; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vehicle_brands (name, logo_url, country, id, created_at, updated_at, is_deleted) FROM stdin;
Chevrolet	\N	O'zbekiston	bd170d61-dbf1-4ae5-a9be-15e6a01ce4ff	2026-04-19 11:38:00.480224+00	2026-04-19 11:38:00.480226+00	f
Hyundai	\N	Koreya	1631581b-7fbf-4fc1-b004-fe28f622a995	2026-04-19 11:38:00.480226+00	2026-04-19 11:38:00.480227+00	f
Kia	\N	Koreya	1e16fb41-a560-48ca-871f-2a853eb3c391	2026-04-19 11:38:00.480227+00	2026-04-19 11:38:00.480227+00	f
Toyota	\N	Yaponiya	918285e0-12e8-4e54-902c-d74d2e8e6026	2026-04-19 11:38:00.480227+00	2026-04-19 11:38:00.480228+00	f
Daewoo	\N	O'zbekiston	9c94b655-d714-4c38-b3f1-22f74df863f1	2026-04-19 11:38:00.480228+00	2026-04-19 11:38:00.480228+00	f
BYD	\N	Xitoy	761959b3-ff30-4912-ad83-be87b17960f6	2026-04-19 11:38:27.370802+00	2026-04-19 11:38:27.370804+00	f
Tesla	\N	AQSH	b7a3e08d-0533-4746-88d3-85ddb7a3f092	2026-04-19 11:38:27.374004+00	2026-04-19 11:38:27.374005+00	f
MERS	\N	GERMANIYA	aff3d910-1976-4b13-b5d2-5426ebc377f7	2026-04-21 07:07:36.455748+00	2026-04-21 07:07:36.45575+00	f
\.


--
-- Data for Name: vehicle_models; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vehicle_models (brand_id, name, year_from, year_to, image_url, id, created_at, updated_at, is_deleted) FROM stdin;
9c94b655-d714-4c38-b3f1-22f74df863f1	Nexia	1995	\N	\N	c9408c9a-452d-4663-b16c-493816d5a25d	2026-04-19 11:38:00.481448+00	2026-04-19 11:38:00.481448+00	f
9c94b655-d714-4c38-b3f1-22f74df863f1	Matiz	1998	\N	\N	5bf86f44-1a7f-4120-8cfd-00d652684369	2026-04-19 11:38:00.481449+00	2026-04-19 11:38:00.481449+00	f
9c94b655-d714-4c38-b3f1-22f74df863f1	Gentra	2013	\N	\N	5ee3bb0e-e0a6-4e9c-ab46-1af20bf63d0f	2026-04-19 11:38:00.481449+00	2026-04-19 11:38:00.48145+00	f
9c94b655-d714-4c38-b3f1-22f74df863f1	Damas	1996	\N	\N	f6711596-8fef-471f-9d6d-2a17478efed3	2026-04-19 11:38:27.356524+00	2026-04-19 11:38:27.356525+00	f
1631581b-7fbf-4fc1-b004-fe28f622a995	Sonata	2019	\N	https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Hyundai_Sonata_DN8_001.jpg/280px-Hyundai_Sonata_DN8_001.jpg	2f28219c-c669-40f2-88ae-10c6d0ad3aa0	2026-04-19 11:38:27.358434+00	2026-04-19 11:38:27.358436+00	f
1631581b-7fbf-4fc1-b004-fe28f622a995	Tucson	2020	\N	\N	0f6e7153-3557-4a89-8f4e-8e7c8fa915a8	2026-04-19 11:38:27.359614+00	2026-04-19 11:38:27.359616+00	f
1631581b-7fbf-4fc1-b004-fe28f622a995	Accent	2017	\N	\N	c18733f0-88fe-44e4-bc97-f31535f7796e	2026-04-19 11:38:27.360828+00	2026-04-19 11:38:27.36083+00	f
1631581b-7fbf-4fc1-b004-fe28f622a995	Santa Fe	2018	\N	\N	0ec2cca8-f994-480d-8aaa-7ab14bfa5045	2026-04-19 11:38:27.361889+00	2026-04-19 11:38:27.361891+00	f
1e16fb41-a560-48ca-871f-2a853eb3c391	K5	2020	\N	\N	b757093b-b0c2-4202-bd5b-1618d968bacd	2026-04-19 11:38:27.363875+00	2026-04-19 11:38:27.363876+00	f
1e16fb41-a560-48ca-871f-2a853eb3c391	Sportage	2021	\N	\N	8a666a10-1038-43c8-8ada-449453befdf8	2026-04-19 11:38:27.364807+00	2026-04-19 11:38:27.364808+00	f
1e16fb41-a560-48ca-871f-2a853eb3c391	Seltos	2020	\N	\N	e36dbf5d-db00-4a61-9841-45ce61e061b7	2026-04-19 11:38:27.365702+00	2026-04-19 11:38:27.365703+00	f
918285e0-12e8-4e54-902c-d74d2e8e6026	Camry	2017	\N	\N	d135100b-817f-4d64-980f-83d42aaa11a8	2026-04-19 11:38:27.367658+00	2026-04-19 11:38:27.36766+00	f
918285e0-12e8-4e54-902c-d74d2e8e6026	Corolla	2018	\N	\N	802fab15-e0cd-4dcc-83f0-eed81d67c41a	2026-04-19 11:38:27.368524+00	2026-04-19 11:38:27.368526+00	f
918285e0-12e8-4e54-902c-d74d2e8e6026	RAV4	2019	\N	\N	6da00347-dcb1-463d-b98d-7ac7344c8b2e	2026-04-19 11:38:27.369469+00	2026-04-19 11:38:27.369471+00	f
b7a3e08d-0533-4746-88d3-85ddb7a3f092	Model 3	2020	\N	\N	c26973ea-b4f3-4043-b894-873fa2279425	2026-04-19 11:38:27.375011+00	2026-04-19 11:38:27.375013+00	f
b7a3e08d-0533-4746-88d3-85ddb7a3f092	Model Y	2021	\N	\N	6318f22f-20a3-4c97-96eb-c169a008d469	2026-04-19 11:38:27.375841+00	2026-04-19 11:38:27.375843+00	f
761959b3-ff30-4912-ad83-be87b17960f6	Song Plus	2023	\N	/uploads/vehicles/435aa512f68344f291e4db5048e0720f.jpg	a9640762-8635-411f-8e8c-9e06fa3db022	2026-04-19 11:38:27.372219+00	2026-04-19 11:46:23.947468+00	f
761959b3-ff30-4912-ad83-be87b17960f6	Han	2022	\N	/uploads/vehicles/5157098767fe4d18bb793cb7c6292d44.jpg	8c89dfa4-a47a-4ead-a5fa-9284e31bec62	2026-04-19 11:38:27.373172+00	2026-04-19 11:46:28.704821+00	f
bd170d61-dbf1-4ae5-a9be-15e6a01ce4ff	Malibu	2016	\N	/uploads/vehicles/3ae20c46b4c74049a8b6ca0d4d964fdf.jpg	e7e8ae93-eeee-4199-b2d7-52e10483c082	2026-04-19 11:38:00.481447+00	2026-04-19 11:46:33.958458+00	f
bd170d61-dbf1-4ae5-a9be-15e6a01ce4ff	Tracker	2020	\N	/uploads/vehicles/6114d6426cdc42bd84724313eff612d4.jpg	bf78dafc-eac1-4ab7-aa20-c1157333a332	2026-04-19 11:38:00.481448+00	2026-04-19 11:46:39.776467+00	f
bd170d61-dbf1-4ae5-a9be-15e6a01ce4ff	Equinox	2018	\N	/uploads/vehicles/910396f36b6e442cad540eb61ec169f8.jpg	10f16a3e-9f64-4955-92d8-60b37717273f	2026-04-19 11:38:27.353171+00	2026-04-19 11:46:44.086975+00	f
bd170d61-dbf1-4ae5-a9be-15e6a01ce4ff	Cobalt	2012	\N	/uploads/vehicles/37064a5c950841e19d1ed96ba63b2e96.jpg	0cfcf118-60fe-4c2a-97d5-618833c25650	2026-04-19 11:38:00.481445+00	2026-04-19 11:46:49.742352+00	f
bd170d61-dbf1-4ae5-a9be-15e6a01ce4ff	Onix	2022	\N	/uploads/vehicles/1b9259aeccf94a3bb2f8308b633c3932.jpg	0be7cee0-97f7-407d-9f06-533fc0ddbd8a	2026-04-19 11:38:27.351767+00	2026-04-19 11:46:56.609689+00	f
aff3d910-1976-4b13-b5d2-5426ebc377f7	asdasd	2222	\N	\N	f014f329-cdd3-4f3c-8e29-bc004a704471	2026-04-21 07:07:50.896084+00	2026-04-21 07:07:50.896087+00	f
\.


--
-- Data for Name: warranties; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.warranties (booking_id, customer_id, workshop_id, duration_months, mileage_km, expires_at, status, id, created_at, updated_at, is_deleted) FROM stdin;
83d15dea-7774-4ad2-8211-f4d8fd59a644	49354f6b-ef90-4176-897d-ceaf428d76f2	f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	12	\N	2027-04-14 11:38:27.127919+00	ACTIVE	49c5db2f-2d86-4025-aed9-fb365f4cc1cf	2026-04-19 11:38:27.515429+00	2026-04-19 11:38:27.515432+00	f
76a39bdf-8d33-400d-b131-a81b3becaa58	960d13c2-aa57-48f6-87d6-3ce926e384ea	ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	6	\N	2026-10-16 11:38:27.127919+00	ACTIVE	4842df44-2af0-48fb-917c-d6d8c975d2ac	2026-04-19 11:38:27.51717+00	2026-04-19 11:38:27.517171+00	f
bfb3a97f-8ca1-4f45-9882-d80e777ac2bc	49354f6b-ef90-4176-897d-ceaf428d76f2	a0cc3386-af63-4387-b8ad-7686da70cd9e	6	\N	2026-10-16 11:38:27.127919+00	ACTIVE	5e5549fc-74e8-4df0-9dfd-3dedc96fc282	2026-04-19 11:38:27.518322+00	2026-04-19 11:38:27.518324+00	f
76aeebf9-a491-4509-af05-3980271f4aa4	79c4fb59-5ea6-4406-b403-8a37b0ec3d22	5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	6	10000	2026-10-16 11:38:27.127919+00	ACTIVE	6e8f4b02-a3f5-412b-b4fc-27f572e0b610	2026-04-19 11:38:27.519332+00	2026-04-19 11:38:27.519334+00	f
b51bc8dc-a8e1-43f3-82a0-86943ef346e4	960d13c2-aa57-48f6-87d6-3ce926e384ea	b7baeea9-fc4d-4cf9-a469-4916155f40bc	12	5000	2027-04-14 11:38:27.127919+00	ACTIVE	b5839cc0-6967-42b6-b32b-bd9b4767382c	2026-04-19 11:38:27.520328+00	2026-04-19 11:38:27.52033+00	f
0aa55171-30b2-4255-a398-276d90e09ba4	960d13c2-aa57-48f6-87d6-3ce926e384ea	ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	12	10000	2027-04-14 11:38:27.127919+00	ACTIVE	d1ef2439-5089-466a-be5f-e04d034cd093	2026-04-19 11:38:27.521353+00	2026-04-19 11:38:27.521355+00	f
d25d3a36-8222-47f7-8496-e62b206c61bc	a82e28be-46c0-40e1-995d-bee60803d783	b7baeea9-fc4d-4cf9-a469-4916155f40bc	6	\N	2026-10-16 11:38:27.127919+00	ACTIVE	c9638362-8d9c-4f22-9b94-bfa2be31ebd7	2026-04-19 11:38:27.522282+00	2026-04-19 11:38:27.522283+00	f
bd1d318e-34ba-4277-9116-e12470d6d33d	960d13c2-aa57-48f6-87d6-3ce926e384ea	a0cc3386-af63-4387-b8ad-7686da70cd9e	6	5000	2026-10-16 11:38:27.127919+00	ACTIVE	59ad76e4-551c-48dd-a452-ed186fae5370	2026-04-19 11:38:27.523093+00	2026-04-19 11:38:27.523094+00	f
\.


--
-- Data for Name: warranty_claims; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.warranty_claims (warranty_id, customer_id, description, photos, status, admin_notes, resolved_at, id, created_at, updated_at, is_deleted) FROM stdin;
49c5db2f-2d86-4025-aed9-fb365f4cc1cf	49354f6b-ef90-4176-897d-ceaf428d76f2	Moy almashtirilgan joyda yana sizib chiqdi	{}	APPROVED	\N	2026-04-21 07:55:27.798781+00	659afa93-9d33-4709-9980-281070e0d728	2026-04-21 07:55:27.799797+00	2026-04-21 07:55:27.799799+00	f
4842df44-2af0-48fb-917c-d6d8c975d2ac	960d13c2-aa57-48f6-87d6-3ce926e384ea	Tormoz nakladkasi 1 oydan keyin g'ichirlay boshladi	{}	REVIEWING	Tekshirilmoqda	\N	abb00b55-060a-4bbe-a44b-50c9dcf58244	2026-04-21 07:55:27.799799+00	2026-04-21 07:55:27.7998+00	f
5e5549fc-74e8-4df0-9dfd-3dedc96fc282	49354f6b-ef90-4176-897d-ceaf428d76f2	Diagnostikadan keyin xato ko'rsatmasi yana chiqdi	{}	SUBMITTED	\N	\N	4c6c6cc1-146c-4a0b-a23c-a9bf306054c2	2026-04-21 07:55:27.7998+00	2026-04-21 07:55:27.7998+00	f
\.


--
-- Data for Name: workshop_certificates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workshop_certificates (workshop_id, title, issued_by, issue_date, image_url, id, created_at, updated_at, is_deleted) FROM stdin;
a0cc3386-af63-4387-b8ad-7686da70cd9e	ISO 9001:2015 Sifat sertifikati	ISO O'zbekiston	2023-06-15	\N	ac97c152-2ed5-475a-a0fc-6a6f812ff008	2026-04-21 07:55:27.775836+00	2026-04-21 07:55:27.775838+00	f
5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	Avto ta'mir xizmatlari litsenziyasi	Davlat avto inspeksiyasi	2023-06-15	\N	d0aa857c-b59e-4095-a924-d4bc247b9caf	2026-04-21 07:55:27.775839+00	2026-04-21 07:55:27.775839+00	f
f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	Bosch diagnostika markazi	Bosch Service	2023-06-15	\N	f008e06d-14ac-402f-8dc1-72a6cc445571	2026-04-21 07:55:27.775839+00	2026-04-21 07:55:27.77584+00	f
f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	ISO 9001:2015 Sifat sertifikati	ISO O'zbekiston	2023-06-15	\N	6b03a893-4210-404f-a555-9c8e0103b1be	2026-04-21 07:55:27.77584+00	2026-04-21 07:55:27.77584+00	f
eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	Avto ta'mir xizmatlari litsenziyasi	Davlat avto inspeksiyasi	2023-06-15	\N	c8d6ae16-cfc3-4ce8-ac2d-f49b82684199	2026-04-21 07:55:27.775841+00	2026-04-21 07:55:27.775841+00	f
42a94963-592f-48d2-8bde-83ce8a2d786f	Bosch diagnostika markazi	Bosch Service	2023-06-15	\N	02b59ad4-6e6d-4171-85ec-8f187d7f8312	2026-04-21 07:55:27.775841+00	2026-04-21 07:55:27.775842+00	f
27e94db0-c00e-4b90-ba64-98d7219c0f33	ISO 9001:2015 Sifat sertifikati	ISO O'zbekiston	2023-06-15	\N	828b3aab-d188-4471-aefe-d5fb9d4d922d	2026-04-21 07:55:27.775842+00	2026-04-21 07:55:27.775842+00	f
ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	Avto ta'mir xizmatlari litsenziyasi	Davlat avto inspeksiyasi	2023-06-15	\N	cecc2b42-63fb-4534-857c-fd2ead281bd0	2026-04-21 07:55:27.775843+00	2026-04-21 07:55:27.775843+00	f
d0157137-b945-482c-aad0-f5b7f57044af	Bosch diagnostika markazi	Bosch Service	2023-06-15	\N	779b433c-eb1a-4d8e-b4b3-0cdedc34b91c	2026-04-21 07:55:27.775843+00	2026-04-21 07:55:27.775843+00	f
b7baeea9-fc4d-4cf9-a469-4916155f40bc	ISO 9001:2015 Sifat sertifikati	ISO O'zbekiston	2023-06-15	\N	59b066b4-0bd8-47a3-aca4-fbe5907d376a	2026-04-21 07:55:27.775844+00	2026-04-21 07:55:27.775844+00	f
1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	Avto ta'mir xizmatlari litsenziyasi	Davlat avto inspeksiyasi	2023-06-15	\N	ff1e906c-33eb-4221-a2e2-07e50b9c48f9	2026-04-21 07:55:27.775844+00	2026-04-21 07:55:27.775845+00	f
7a9fc58a-df61-44ad-a3e3-4725f73371a8	Bosch diagnostika markazi	Bosch Service	2023-06-15	\N	6f185b7b-67b5-4576-b9da-539b0d342bfc	2026-04-21 07:55:27.775845+00	2026-04-21 07:55:27.775845+00	f
a3809b36-54fc-4c8f-904e-ef9c1bf67295	ISO 9001:2015 Sifat sertifikati	ISO O'zbekiston	2023-06-15	\N	62d69544-0093-45fd-904f-fa564dc46691	2026-04-21 07:55:27.775846+00	2026-04-21 07:55:27.775846+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	Avto ta'mir xizmatlari litsenziyasi	Davlat avto inspeksiyasi	2023-06-15	\N	19dd773e-68f5-4e1b-9952-2d76790fe085	2026-04-21 07:55:27.775846+00	2026-04-21 07:55:27.775846+00	f
4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	Bosch diagnostika markazi	Bosch Service	2023-06-15	\N	62080795-09bd-40da-9c06-f4f0cd17c856	2026-04-21 07:55:27.775847+00	2026-04-21 07:55:27.775847+00	f
c27697c9-9ac9-4e9f-8e3b-5c2519f8983c	ISO 9001:2015 Sifat sertifikati	ISO O'zbekiston	2023-06-15	\N	2918b13b-4703-4f71-87aa-4d6b27000e71	2026-04-21 07:55:27.775847+00	2026-04-21 07:55:27.775848+00	f
02ed243f-ad3a-4355-95f0-f04b6f28a7c4	Avto ta'mir xizmatlari litsenziyasi	Davlat avto inspeksiyasi	2023-06-15	\N	f0659585-ae3a-4e27-8867-c258ecc19e0b	2026-04-21 07:55:27.775848+00	2026-04-21 07:55:27.775848+00	f
\.


--
-- Data for Name: workshop_photos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workshop_photos (workshop_id, url, "order", is_main, id, created_at, updated_at, is_deleted) FROM stdin;
4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	/uploads/workshops/81ed98fc609c41569d5a2f1841bf9898.jpg	1	t	28232627-4e0f-45d9-b28c-27498d8ecbf0	2026-04-19 11:55:27.429691+00	2026-04-19 11:55:27.429694+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	/uploads/workshops/e9c5ad14c7db4657bfa44cff04e9157f.jpg	2	f	f701a816-3d9a-49f2-99df-10ccd639a80d	2026-04-19 11:55:44.87628+00	2026-04-19 11:55:44.876283+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	/uploads/workshops/e24ce1faf03341b1bb4f4d1c84d7ced8.jpg	1	t	52d90ad6-5dac-4f0e-9625-265659a43e2d	2026-04-19 11:55:40.551785+00	2026-04-19 11:55:47.306223+00	t
a3809b36-54fc-4c8f-904e-ef9c1bf67295	/uploads/workshops/93c0fa1a779144cbae03dd366866bc97.jpg	1	t	5e1038ef-4c6e-4c96-afda-a6d9b4d62d0a	2026-04-19 11:58:26.086608+00	2026-04-19 11:58:26.086612+00	f
7a9fc58a-df61-44ad-a3e3-4725f73371a8	/uploads/workshops/7d9702bf695547b496f53c2f7e3eb5b4.jpg	1	t	9ee9e7f3-0f0c-4b56-8492-7e312b8a4c5a	2026-04-19 11:58:36.997949+00	2026-04-19 11:58:36.997953+00	f
1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	/uploads/workshops/efb17b42675b49b2ae63400d7bb0a10e.jpg	1	t	5e5d38ac-1981-4911-a061-3c1a90b6765c	2026-04-19 11:58:45.09149+00	2026-04-19 11:58:45.091493+00	f
b7baeea9-fc4d-4cf9-a469-4916155f40bc	/uploads/workshops/c84b4b025bb94c1fa963946f84166b50.jpg	1	t	00e4ef78-be1d-411c-b1bd-dc379981b055	2026-04-19 11:58:53.846544+00	2026-04-19 11:58:53.846547+00	f
d0157137-b945-482c-aad0-f5b7f57044af	/uploads/workshops/0dcb39f409c946dca4d2100b931c41f3.jpg	1	t	1dfb892e-b375-4d93-a400-887523e3ef4a	2026-04-19 11:59:03.746146+00	2026-04-19 11:59:03.746149+00	f
ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	/uploads/workshops/b616fc9b92f34a259134c8ec71c25ba7.jpg	1	t	94929713-7252-40ac-9fb8-cdba969ba42c	2026-04-19 11:59:16.52813+00	2026-04-19 11:59:16.528133+00	f
27e94db0-c00e-4b90-ba64-98d7219c0f33	/uploads/workshops/b37cc38781f84ea49eef52256a3eaaac.jpg	1	t	7a2b587f-61b7-48cb-8d59-9cb6d1e1f669	2026-04-19 12:00:37.190106+00	2026-04-19 12:00:37.190109+00	f
42a94963-592f-48d2-8bde-83ce8a2d786f	/uploads/workshops/d649146bbeae4acdbb18b13a5864211c.jpg	1	t	3c0063fb-f269-45e0-92bf-a3ee27bc4742	2026-04-19 12:00:43.898233+00	2026-04-19 12:00:43.898236+00	f
eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	/uploads/workshops/4b4893c9e8b74f4684ce447b40653a35.jpg	1	t	310cf921-b7ff-4cb1-83b3-8d4d63fe5d76	2026-04-19 12:00:53.289894+00	2026-04-19 12:00:53.289897+00	f
f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	/uploads/workshops/89cd35c6c55a484790eca56ba10abfaf.jpg	1	t	41e67c3e-31ec-4ddf-bf9e-54266b39db01	2026-04-19 12:01:00.78988+00	2026-04-19 12:01:00.789883+00	f
a0cc3386-af63-4387-b8ad-7686da70cd9e	/uploads/workshops/0dcb39f409c946dca4d2100b931c41f3.jpg	0	t	b6da3f55-2d1e-4242-a46b-633af33bad31	2026-04-21 07:55:27.756216+00	2026-04-21 07:55:27.756218+00	f
5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	/uploads/workshops/37a138bcae41412d998347e4839acbe6.jpg	0	t	09431cdd-d810-4e04-9d87-629cd67c9740	2026-04-21 07:55:27.758295+00	2026-04-21 07:55:27.758297+00	f
f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	/uploads/workshops/4b4893c9e8b74f4684ce447b40653a35.jpg	0	t	3f5c7332-dc1c-4ab4-924b-5fd1cfb4659f	2026-04-21 07:55:27.759575+00	2026-04-21 07:55:27.759577+00	f
c27697c9-9ac9-4e9f-8e3b-5c2519f8983c	/uploads/workshops/54161102e89b40778ea4ff8817a38691.png	0	t	b777396a-916f-457c-90e0-f420e270947f	2026-04-21 07:55:27.765927+00	2026-04-21 07:55:27.765929+00	f
02ed243f-ad3a-4355-95f0-f04b6f28a7c4	/uploads/workshops/616a65b7d967463abb00ca66a28bfbe5.jpg	0	t	a29d76ee-2cc2-44c2-aad3-657c2fa0908e	2026-04-21 07:55:27.767132+00	2026-04-21 07:55:27.767134+00	f
\.


--
-- Data for Name: workshop_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workshop_schedules (workshop_id, day_of_week, open_time, close_time, is_closed, slot_duration_minutes, max_concurrent_bookings, id, created_at, updated_at, is_deleted) FROM stdin;
a0cc3386-af63-4387-b8ad-7686da70cd9e	0	09:00:00	18:00:00	f	30	2	e2fbb4a1-0815-47ec-bdf5-8e16d390e5ea	2026-04-19 11:38:00.48805+00	2026-04-19 11:38:00.488052+00	f
a0cc3386-af63-4387-b8ad-7686da70cd9e	1	09:00:00	18:00:00	f	30	2	02080ba4-9f9d-4060-bff1-a64f8b97558c	2026-04-19 11:38:00.488053+00	2026-04-19 11:38:00.488053+00	f
a0cc3386-af63-4387-b8ad-7686da70cd9e	2	09:00:00	18:00:00	f	30	2	0abe1a93-daa4-4d81-9d13-799442307a7d	2026-04-19 11:38:00.488054+00	2026-04-19 11:38:00.488054+00	f
a0cc3386-af63-4387-b8ad-7686da70cd9e	3	09:00:00	18:00:00	f	30	2	dd6c59bd-de25-49eb-9116-5f008b3d7b9e	2026-04-19 11:38:00.488054+00	2026-04-19 11:38:00.488055+00	f
a0cc3386-af63-4387-b8ad-7686da70cd9e	4	09:00:00	18:00:00	f	30	2	9cb5bf95-d728-42c6-aa18-65a7d95cf097	2026-04-19 11:38:00.488055+00	2026-04-19 11:38:00.488055+00	f
a0cc3386-af63-4387-b8ad-7686da70cd9e	5	09:00:00	15:00:00	f	30	2	712ab1d0-4e18-4ec7-a2ea-ec4a6d7a84d1	2026-04-19 11:38:00.488056+00	2026-04-19 11:38:00.488056+00	f
a0cc3386-af63-4387-b8ad-7686da70cd9e	6	09:00:00	15:00:00	t	30	2	ef6fdb49-3cb8-4ca0-911b-0433f88fc987	2026-04-19 11:38:00.488056+00	2026-04-19 11:38:00.488056+00	f
5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	0	09:00:00	18:00:00	f	30	2	c384efe6-d3e4-412d-b69d-9ee9134752f5	2026-04-19 11:38:00.488057+00	2026-04-19 11:38:00.488057+00	f
5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	1	09:00:00	18:00:00	f	30	2	9fd735a2-b12b-4a7e-ad91-fc8bc37ef54d	2026-04-19 11:38:00.488057+00	2026-04-19 11:38:00.488058+00	f
5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	2	09:00:00	18:00:00	f	30	2	de3d785a-4d30-47aa-b1bd-571092a4db9f	2026-04-19 11:38:00.488058+00	2026-04-19 11:38:00.488058+00	f
5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	3	09:00:00	18:00:00	f	30	2	30f814da-a0a5-41ec-94d2-8105e3f3b19e	2026-04-19 11:38:00.488059+00	2026-04-19 11:38:00.488059+00	f
5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	4	09:00:00	18:00:00	f	30	2	870a116d-8b6b-421e-9779-b544ad962d6e	2026-04-19 11:38:00.488059+00	2026-04-19 11:38:00.488059+00	f
5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	5	09:00:00	15:00:00	f	30	2	106ca1fd-886d-43ae-b047-37395caf6694	2026-04-19 11:38:00.48806+00	2026-04-19 11:38:00.48806+00	f
5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	6	09:00:00	15:00:00	t	30	2	971e437f-05ab-4854-bfee-85fc142725b3	2026-04-19 11:38:00.48806+00	2026-04-19 11:38:00.488061+00	f
f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	0	09:00:00	18:00:00	f	30	2	f4d33a68-77aa-4344-b9fa-9836d5ea24f5	2026-04-19 11:38:00.488061+00	2026-04-19 11:38:00.488061+00	f
f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	1	09:00:00	18:00:00	f	30	2	24684a3e-0439-409b-844b-3c6b3f7bb6b8	2026-04-19 11:38:00.488061+00	2026-04-19 11:38:00.488062+00	f
f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	2	09:00:00	18:00:00	f	30	2	8a129d23-da2d-44e7-a3ea-14e74931d568	2026-04-19 11:38:00.488062+00	2026-04-19 11:38:00.488063+00	f
f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	3	09:00:00	18:00:00	f	30	2	766d361b-d3bd-4aa9-b7cb-f32a7f624c83	2026-04-19 11:38:00.488063+00	2026-04-19 11:38:00.488063+00	f
f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	4	09:00:00	18:00:00	f	30	2	89a78e78-2549-4492-a3a5-4ce4ad553544	2026-04-19 11:38:00.488064+00	2026-04-19 11:38:00.488064+00	f
f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	5	09:00:00	15:00:00	f	30	2	1386d573-d089-4239-aee3-3283e1a4ea72	2026-04-19 11:38:00.488064+00	2026-04-19 11:38:00.488064+00	f
f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	6	09:00:00	15:00:00	t	30	2	e5e5efae-740f-4136-8d9d-e946834277a2	2026-04-19 11:38:00.488065+00	2026-04-19 11:38:00.488065+00	f
f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	0	09:00:00	18:00:00	f	30	2	12869710-5717-4291-aec5-6f036d54b6bd	2026-04-19 11:38:00.488066+00	2026-04-19 11:38:00.488066+00	f
f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	1	09:00:00	18:00:00	f	30	2	2e871ddc-3829-4ccb-9917-e7276cd67a40	2026-04-19 11:38:00.488067+00	2026-04-19 11:38:00.488067+00	f
f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	2	09:00:00	18:00:00	f	30	2	a5614d47-cac9-4327-9257-0384e5c40d67	2026-04-19 11:38:00.488068+00	2026-04-19 11:38:00.488069+00	f
f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	3	09:00:00	18:00:00	f	30	2	367674dc-5261-45be-bb6c-7e1eebf8feca	2026-04-19 11:38:00.488069+00	2026-04-19 11:38:00.48807+00	f
f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	4	09:00:00	18:00:00	f	30	2	8d379aa9-a744-48f3-9df7-cd28463d8714	2026-04-19 11:38:00.48807+00	2026-04-19 11:38:00.488071+00	f
f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	5	09:00:00	15:00:00	f	30	2	51a9dd72-1c3b-4035-a106-9213edd9fd8e	2026-04-19 11:38:00.488071+00	2026-04-19 11:38:00.488072+00	f
f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	6	09:00:00	15:00:00	t	30	2	666d8b60-809c-4173-8450-b960e897bef0	2026-04-19 11:38:00.488072+00	2026-04-19 11:38:00.488073+00	f
eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	0	09:00:00	18:00:00	f	30	2	6975a327-031f-4efa-9a31-cab248c79acf	2026-04-19 11:38:00.488073+00	2026-04-19 11:38:00.488074+00	f
eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	1	09:00:00	18:00:00	f	30	2	ae515c27-641f-4d67-8745-415e66aaafa8	2026-04-19 11:38:00.488074+00	2026-04-19 11:38:00.488075+00	f
eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	2	09:00:00	18:00:00	f	30	2	797eb6b1-8dab-4fbd-8474-ce04fcd8a4ae	2026-04-19 11:38:00.488075+00	2026-04-19 11:38:00.488075+00	f
eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	3	09:00:00	18:00:00	f	30	2	472155e8-b4a4-49cc-a4a5-7f5262ce695d	2026-04-19 11:38:00.488076+00	2026-04-19 11:38:00.488076+00	f
eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	4	09:00:00	18:00:00	f	30	2	856eac6e-7691-4259-81b4-cfb9a6988791	2026-04-19 11:38:00.488076+00	2026-04-19 11:38:00.488077+00	f
eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	5	09:00:00	15:00:00	f	30	2	b71b77d4-b2d5-4ba5-8e8f-23d69734036d	2026-04-19 11:38:00.488077+00	2026-04-19 11:38:00.488077+00	f
eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	6	09:00:00	15:00:00	t	30	2	b5dd242c-d52c-45f7-9a9a-e897fbd4e108	2026-04-19 11:38:00.488078+00	2026-04-19 11:38:00.488078+00	f
42a94963-592f-48d2-8bde-83ce8a2d786f	0	09:00:00	18:00:00	f	30	2	a8f27996-b6ba-437e-8c70-992dd9aba878	2026-04-19 11:38:27.439111+00	2026-04-19 11:38:27.439113+00	f
42a94963-592f-48d2-8bde-83ce8a2d786f	1	09:00:00	18:00:00	f	30	2	a921bf83-341b-4c85-a6e3-0dcd7ac66a8a	2026-04-19 11:38:27.439114+00	2026-04-19 11:38:27.439114+00	f
42a94963-592f-48d2-8bde-83ce8a2d786f	2	09:00:00	18:00:00	f	30	2	6aecf152-ceff-451b-a04e-77f0cf918a4c	2026-04-19 11:38:27.439114+00	2026-04-19 11:38:27.439115+00	f
42a94963-592f-48d2-8bde-83ce8a2d786f	3	09:00:00	18:00:00	f	30	2	4985d25e-1350-4e24-aff1-5196128c7935	2026-04-19 11:38:27.439115+00	2026-04-19 11:38:27.439115+00	f
42a94963-592f-48d2-8bde-83ce8a2d786f	4	09:00:00	18:00:00	f	30	2	1a2f8e00-cc89-4cf2-83ac-dbc4199974d3	2026-04-19 11:38:27.439116+00	2026-04-19 11:38:27.439116+00	f
42a94963-592f-48d2-8bde-83ce8a2d786f	5	09:00:00	15:00:00	f	30	2	7d6f64ef-db48-40fc-84d2-5a718bb0dc4b	2026-04-19 11:38:27.439116+00	2026-04-19 11:38:27.439117+00	f
42a94963-592f-48d2-8bde-83ce8a2d786f	6	09:00:00	15:00:00	t	30	2	7cac9759-7f66-4e0a-8616-a3d443f725c5	2026-04-19 11:38:27.439117+00	2026-04-19 11:38:27.439117+00	f
27e94db0-c00e-4b90-ba64-98d7219c0f33	0	09:00:00	18:00:00	f	30	2	d763b3ad-fc1e-403d-8ccc-00300ac910e2	2026-04-19 11:38:27.443696+00	2026-04-19 11:38:27.443699+00	f
27e94db0-c00e-4b90-ba64-98d7219c0f33	1	09:00:00	18:00:00	f	30	2	6000b30e-027e-4c21-9615-473b55184b0a	2026-04-19 11:38:27.443699+00	2026-04-19 11:38:27.4437+00	f
27e94db0-c00e-4b90-ba64-98d7219c0f33	2	09:00:00	18:00:00	f	30	2	a6452308-c141-408b-8b21-4bc12001b5e0	2026-04-19 11:38:27.4437+00	2026-04-19 11:38:27.4437+00	f
27e94db0-c00e-4b90-ba64-98d7219c0f33	3	09:00:00	18:00:00	f	30	2	aaf3c5b5-5934-4bb7-92e0-1cd2f4ea2f40	2026-04-19 11:38:27.443701+00	2026-04-19 11:38:27.443701+00	f
27e94db0-c00e-4b90-ba64-98d7219c0f33	4	09:00:00	18:00:00	f	30	2	d06f1c65-55b9-40c0-9c5d-49119b32ad78	2026-04-19 11:38:27.443702+00	2026-04-19 11:38:27.443702+00	f
27e94db0-c00e-4b90-ba64-98d7219c0f33	5	09:00:00	15:00:00	f	30	2	f1eb17df-6a6e-4777-af46-4e9658d6c292	2026-04-19 11:38:27.443702+00	2026-04-19 11:38:27.443703+00	f
27e94db0-c00e-4b90-ba64-98d7219c0f33	6	09:00:00	15:00:00	t	30	2	05da9fdb-5ecf-4fc6-9841-adbc698b845d	2026-04-19 11:38:27.443703+00	2026-04-19 11:38:27.443703+00	f
ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	0	09:00:00	18:00:00	f	30	2	c9bc217f-b4ed-4fe6-8e8d-04a021a52a7b	2026-04-19 11:38:27.446805+00	2026-04-19 11:38:27.446807+00	f
ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	1	09:00:00	18:00:00	f	30	2	2891e627-983f-41f1-af63-200e7557a52f	2026-04-19 11:38:27.446808+00	2026-04-19 11:38:27.446808+00	f
ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	2	09:00:00	18:00:00	f	30	2	a7521d5c-17a6-491d-8b4a-2cc8c6797c67	2026-04-19 11:38:27.446808+00	2026-04-19 11:38:27.446808+00	f
ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	3	09:00:00	18:00:00	f	30	2	2be4791b-21dd-4ab8-a957-ff3ee981ac4e	2026-04-19 11:38:27.446809+00	2026-04-19 11:38:27.446809+00	f
ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	4	09:00:00	18:00:00	f	30	2	e352f0db-ecb8-4528-80eb-0b83b6c6cd98	2026-04-19 11:38:27.446809+00	2026-04-19 11:38:27.446809+00	f
ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	5	09:00:00	15:00:00	f	30	2	046bcf35-3c70-420a-b8dd-3c7e07a222c5	2026-04-19 11:38:27.44681+00	2026-04-19 11:38:27.44681+00	f
ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	6	09:00:00	15:00:00	t	30	2	0459833b-7e92-4c83-aa34-663cf7488d6a	2026-04-19 11:38:27.44681+00	2026-04-19 11:38:27.446811+00	f
d0157137-b945-482c-aad0-f5b7f57044af	0	09:00:00	18:00:00	f	30	2	5517acd1-b196-4f58-8a71-1eb42a6ff18e	2026-04-19 11:38:27.44962+00	2026-04-19 11:38:27.449622+00	f
d0157137-b945-482c-aad0-f5b7f57044af	1	09:00:00	18:00:00	f	30	2	45d23271-c6ac-4c32-92ad-6caea4b2450c	2026-04-19 11:38:27.449622+00	2026-04-19 11:38:27.449623+00	f
d0157137-b945-482c-aad0-f5b7f57044af	2	09:00:00	18:00:00	f	30	2	9c89a511-4295-4003-b836-226e26537beb	2026-04-19 11:38:27.449623+00	2026-04-19 11:38:27.449623+00	f
d0157137-b945-482c-aad0-f5b7f57044af	3	09:00:00	18:00:00	f	30	2	c112ef6c-2e56-485a-89b3-e34e31746811	2026-04-19 11:38:27.449624+00	2026-04-19 11:38:27.449624+00	f
d0157137-b945-482c-aad0-f5b7f57044af	4	09:00:00	18:00:00	f	30	2	481a6568-e496-4ff6-a177-0267774b0cac	2026-04-19 11:38:27.449624+00	2026-04-19 11:38:27.449624+00	f
d0157137-b945-482c-aad0-f5b7f57044af	5	09:00:00	15:00:00	f	30	2	7d520a16-7331-42e5-9ea5-ee7e7c7cfd80	2026-04-19 11:38:27.449625+00	2026-04-19 11:38:27.449625+00	f
d0157137-b945-482c-aad0-f5b7f57044af	6	09:00:00	15:00:00	t	30	2	daf448fd-21c2-4a62-9d2a-e181fffb9540	2026-04-19 11:38:27.449625+00	2026-04-19 11:38:27.449625+00	f
b7baeea9-fc4d-4cf9-a469-4916155f40bc	0	09:00:00	18:00:00	f	30	2	4ef3daf2-60c4-4c61-b4dd-bc1d0e32de3c	2026-04-19 11:38:27.452282+00	2026-04-19 11:38:27.452283+00	f
b7baeea9-fc4d-4cf9-a469-4916155f40bc	1	09:00:00	18:00:00	f	30	2	aef0f267-d8c6-4f3c-b5bc-669d0e7ae2a3	2026-04-19 11:38:27.452284+00	2026-04-19 11:38:27.452284+00	f
b7baeea9-fc4d-4cf9-a469-4916155f40bc	2	09:00:00	18:00:00	f	30	2	810a333a-b5d1-494d-80e2-c135d8516140	2026-04-19 11:38:27.452284+00	2026-04-19 11:38:27.452285+00	f
b7baeea9-fc4d-4cf9-a469-4916155f40bc	3	09:00:00	18:00:00	f	30	2	fef36d27-89ef-47fa-8814-c0c8bf3c5445	2026-04-19 11:38:27.452285+00	2026-04-19 11:38:27.452285+00	f
b7baeea9-fc4d-4cf9-a469-4916155f40bc	4	09:00:00	18:00:00	f	30	2	eaba7eed-daba-4b70-9f83-527aa5906270	2026-04-19 11:38:27.452285+00	2026-04-19 11:38:27.452286+00	f
b7baeea9-fc4d-4cf9-a469-4916155f40bc	5	09:00:00	15:00:00	f	30	2	82215351-3998-4a65-b54a-9c76af0ed536	2026-04-19 11:38:27.452286+00	2026-04-19 11:38:27.452286+00	f
b7baeea9-fc4d-4cf9-a469-4916155f40bc	6	09:00:00	15:00:00	t	30	2	19903834-6dd9-47de-8f57-7c4bf04162fe	2026-04-19 11:38:27.452286+00	2026-04-19 11:38:27.452287+00	f
1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	0	09:00:00	18:00:00	f	30	2	6e516a37-eb75-4f2b-b862-1db7d67dde3d	2026-04-19 11:38:27.45509+00	2026-04-19 11:38:27.455092+00	f
1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	1	09:00:00	18:00:00	f	30	2	a634208b-0a39-4443-9371-97ff5ce009b2	2026-04-19 11:38:27.455092+00	2026-04-19 11:38:27.455093+00	f
1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	2	09:00:00	18:00:00	f	30	2	9d78bbf1-ad87-4ec4-ba28-115c9e440faf	2026-04-19 11:38:27.455093+00	2026-04-19 11:38:27.455093+00	f
1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	3	09:00:00	18:00:00	f	30	2	8a54f853-8ad5-440d-a624-94b9774129a4	2026-04-19 11:38:27.455094+00	2026-04-19 11:38:27.455094+00	f
1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	4	09:00:00	18:00:00	f	30	2	496ff5ed-418e-4ba4-8a4b-b282e5f8ca7c	2026-04-19 11:38:27.455094+00	2026-04-19 11:38:27.455094+00	f
1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	5	09:00:00	15:00:00	f	30	2	66333c22-f842-4cf6-ab49-ff44dbf88911	2026-04-19 11:38:27.455095+00	2026-04-19 11:38:27.455095+00	f
1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	6	09:00:00	15:00:00	t	30	2	4a8719b4-60bd-4f73-a11b-b71ca0c58df8	2026-04-19 11:38:27.455095+00	2026-04-19 11:38:27.455095+00	f
7a9fc58a-df61-44ad-a3e3-4725f73371a8	0	09:00:00	18:00:00	f	30	2	d52cd7a2-2d76-4c69-8fe0-606074969d08	2026-04-19 11:38:27.45788+00	2026-04-19 11:38:27.457882+00	f
7a9fc58a-df61-44ad-a3e3-4725f73371a8	1	09:00:00	18:00:00	f	30	2	cbc77d43-adb1-450d-ba63-8208ff00bd7b	2026-04-19 11:38:27.457883+00	2026-04-19 11:38:27.457883+00	f
7a9fc58a-df61-44ad-a3e3-4725f73371a8	2	09:00:00	18:00:00	f	30	2	df099ec1-f629-45a5-a670-bcb32b4cdd89	2026-04-19 11:38:27.457883+00	2026-04-19 11:38:27.457883+00	f
7a9fc58a-df61-44ad-a3e3-4725f73371a8	3	09:00:00	18:00:00	f	30	2	1c598cf2-329e-4c31-bb53-a533300be091	2026-04-19 11:38:27.457884+00	2026-04-19 11:38:27.457884+00	f
7a9fc58a-df61-44ad-a3e3-4725f73371a8	4	09:00:00	18:00:00	f	30	2	fee6882e-80d5-4819-9139-491e752a0d5b	2026-04-19 11:38:27.457884+00	2026-04-19 11:38:27.457885+00	f
7a9fc58a-df61-44ad-a3e3-4725f73371a8	5	09:00:00	15:00:00	f	30	2	4f188b56-ec8b-46e4-8368-50c66539c7ed	2026-04-19 11:38:27.457885+00	2026-04-19 11:38:27.457885+00	f
7a9fc58a-df61-44ad-a3e3-4725f73371a8	6	09:00:00	15:00:00	t	30	2	52190368-07f7-4780-98d6-2d4d0fd3308c	2026-04-19 11:38:27.457885+00	2026-04-19 11:38:27.457886+00	f
a3809b36-54fc-4c8f-904e-ef9c1bf67295	0	09:00:00	18:00:00	f	30	2	1bcbe349-3936-47ae-b770-f3787bd7d356	2026-04-19 11:38:27.460889+00	2026-04-19 11:38:27.46089+00	f
a3809b36-54fc-4c8f-904e-ef9c1bf67295	1	09:00:00	18:00:00	f	30	2	2372542c-491f-43e8-a1f1-f8465018d681	2026-04-19 11:38:27.460891+00	2026-04-19 11:38:27.460891+00	f
a3809b36-54fc-4c8f-904e-ef9c1bf67295	2	09:00:00	18:00:00	f	30	2	d7ab7d07-670d-43d1-a689-b8d53d91ad34	2026-04-19 11:38:27.460892+00	2026-04-19 11:38:27.460892+00	f
a3809b36-54fc-4c8f-904e-ef9c1bf67295	3	09:00:00	18:00:00	f	30	2	363144ed-554a-436c-bc24-caa0b2b1a62d	2026-04-19 11:38:27.460892+00	2026-04-19 11:38:27.460892+00	f
a3809b36-54fc-4c8f-904e-ef9c1bf67295	4	09:00:00	18:00:00	f	30	2	8d8bfc5e-88c3-4654-82d7-3075e901ce6e	2026-04-19 11:38:27.460893+00	2026-04-19 11:38:27.460893+00	f
a3809b36-54fc-4c8f-904e-ef9c1bf67295	5	09:00:00	15:00:00	f	30	2	d7b080a0-0623-486e-9bba-72ed2fcd28ee	2026-04-19 11:38:27.460893+00	2026-04-19 11:38:27.460893+00	f
a3809b36-54fc-4c8f-904e-ef9c1bf67295	6	09:00:00	15:00:00	t	30	2	6a3a7b63-5d50-4ce8-ad66-d28e579b8d2d	2026-04-19 11:38:27.460894+00	2026-04-19 11:38:27.460894+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	0	09:00:00	18:00:00	f	30	2	a57314b5-ee65-4af9-ba6e-933b2e8ea5e4	2026-04-19 11:38:27.463755+00	2026-04-19 11:38:27.463756+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	1	09:00:00	18:00:00	f	30	2	78159603-4d25-4e9a-9caa-00bcb3a886d4	2026-04-19 11:38:27.463757+00	2026-04-19 11:38:27.463757+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	2	09:00:00	18:00:00	f	30	2	ee9b7b96-d61e-4b76-8f6d-ef6d418a1f7e	2026-04-19 11:38:27.463758+00	2026-04-19 11:38:27.463758+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	3	09:00:00	18:00:00	f	30	2	c3cdb5dc-1d99-4271-9e85-b49693d5db31	2026-04-19 11:38:27.463758+00	2026-04-19 11:38:27.463758+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	4	09:00:00	18:00:00	f	30	2	d21f5374-030a-493c-91ff-91f50f7bedc9	2026-04-19 11:38:27.463759+00	2026-04-19 11:38:27.463759+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	5	09:00:00	15:00:00	f	30	2	f4f93b84-e6ae-4d0c-8bfc-4d030794d1e5	2026-04-19 11:38:27.463759+00	2026-04-19 11:38:27.463759+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	6	09:00:00	15:00:00	t	30	2	b77bee76-4f29-4b31-a94b-bdb90bb977df	2026-04-19 11:38:27.46376+00	2026-04-19 11:38:27.46376+00	f
4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	0	09:00:00	18:00:00	f	30	2	302cc24a-aa5e-41fe-bf91-9b4a37b6c03c	2026-04-19 11:38:27.466429+00	2026-04-19 11:38:27.466431+00	f
4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	1	09:00:00	18:00:00	f	30	2	49ad158b-2ef4-4f7a-82c7-9e3782a1b552	2026-04-19 11:38:27.466431+00	2026-04-19 11:38:27.466432+00	f
4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	2	09:00:00	18:00:00	f	30	2	888f8f88-0d13-49f4-aee6-2338d05daafc	2026-04-19 11:38:27.466432+00	2026-04-19 11:38:27.466432+00	f
4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	3	09:00:00	18:00:00	f	30	2	11a0c8cb-a168-4719-9dd3-2ba125ff51b0	2026-04-19 11:38:27.466433+00	2026-04-19 11:38:27.466433+00	f
4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	4	09:00:00	18:00:00	f	30	2	ffd212a5-8271-4072-85ba-dc924725a082	2026-04-19 11:38:27.466433+00	2026-04-19 11:38:27.466433+00	f
4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	5	09:00:00	15:00:00	f	30	2	8ee29bba-0d10-4b8e-a69b-519f9b25c03c	2026-04-19 11:38:27.466434+00	2026-04-19 11:38:27.466434+00	f
4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	6	09:00:00	15:00:00	t	30	2	afd9f490-7147-4f1e-afcb-dd9416f172b0	2026-04-19 11:38:27.466434+00	2026-04-19 11:38:27.466435+00	f
\.


--
-- Data for Name: workshop_services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workshop_services (workshop_id, category_id, name, price_from, price_to, duration_minutes, is_available, id, created_at, updated_at, is_deleted) FROM stdin;
a0cc3386-af63-4387-b8ad-7686da70cd9e	\N	Moy almashtirish	80000.00	150000.00	30	t	1482626c-70c2-45ad-88a3-9398c75f2dbe	2026-04-19 11:38:00.490381+00	2026-04-19 11:38:00.490383+00	f
a0cc3386-af63-4387-b8ad-7686da70cd9e	\N	Diagnostika	50000.00	100000.00	45	t	2bc6e2e9-30be-4838-b44b-df127faec3cd	2026-04-19 11:38:00.490384+00	2026-04-19 11:38:00.490384+00	f
a0cc3386-af63-4387-b8ad-7686da70cd9e	\N	Tormoz nakladkasi	120000.00	250000.00	60	t	7f53c823-be16-4987-acd1-4378f933440a	2026-04-19 11:38:00.490384+00	2026-04-19 11:38:00.490385+00	f
5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	\N	Moy almashtirish	80000.00	150000.00	30	t	6eed8258-51e0-416e-a4bb-8b43866ccddc	2026-04-19 11:38:00.490385+00	2026-04-19 11:38:00.490385+00	f
5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	\N	Diagnostika	50000.00	100000.00	45	t	b8e47679-0011-4f74-a8f3-995613e949cb	2026-04-19 11:38:00.490385+00	2026-04-19 11:38:00.490386+00	f
5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	\N	Tormoz nakladkasi	120000.00	250000.00	60	t	0ebaf7bc-ecec-4d6b-b98a-1092c807f276	2026-04-19 11:38:00.490386+00	2026-04-19 11:38:00.490386+00	f
f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	\N	Moy almashtirish	80000.00	150000.00	30	t	83711ccf-60ba-43f1-b5fe-880b8d480c25	2026-04-19 11:38:00.490387+00	2026-04-19 11:38:00.490387+00	f
f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	\N	Diagnostika	50000.00	100000.00	45	t	a0c0f3eb-7367-4557-ba5e-be1fb54f2557	2026-04-19 11:38:00.490387+00	2026-04-19 11:38:00.490387+00	f
f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	\N	Tormoz nakladkasi	120000.00	250000.00	60	t	61d554fb-cae5-416c-9956-d5bcca908410	2026-04-19 11:38:00.490388+00	2026-04-19 11:38:00.490388+00	f
f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	\N	Moy almashtirish	80000.00	150000.00	30	t	8a2b1d3a-0437-4275-85a1-6959d10c464a	2026-04-19 11:38:00.490388+00	2026-04-19 11:38:00.490389+00	f
f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	\N	Diagnostika	50000.00	100000.00	45	t	ae0be33a-cc3e-42ab-92e6-529a0b5fb800	2026-04-19 11:38:00.490389+00	2026-04-19 11:38:00.490389+00	f
f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	\N	Tormoz nakladkasi	120000.00	250000.00	60	t	427c5149-b49e-461b-962a-a0128f7bedb0	2026-04-19 11:38:00.490389+00	2026-04-19 11:38:00.49039+00	f
eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	\N	Moy almashtirish	80000.00	150000.00	30	t	23a2611e-7bbd-44d1-9c3b-0343d53535ed	2026-04-19 11:38:00.49039+00	2026-04-19 11:38:00.49039+00	f
eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	\N	Diagnostika	50000.00	100000.00	45	t	841c7407-f60d-4fa8-add0-d4519632943c	2026-04-19 11:38:00.490391+00	2026-04-19 11:38:00.490391+00	f
eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	\N	Tormoz nakladkasi	120000.00	250000.00	60	t	7b8c3672-8889-4e00-9797-dda98db8d6fd	2026-04-19 11:38:00.490391+00	2026-04-19 11:38:00.490391+00	f
42a94963-592f-48d2-8bde-83ce8a2d786f	\N	Moy almashtirish	80000.00	150000.00	30	t	eb565c6c-bde6-443e-bfcb-61fa60cfdc7e	2026-04-19 11:38:27.440545+00	2026-04-19 11:38:27.440547+00	f
42a94963-592f-48d2-8bde-83ce8a2d786f	\N	Diagnostika	50000.00	100000.00	45	t	0750f16a-384d-4257-8332-d2fae31490da	2026-04-19 11:38:27.440547+00	2026-04-19 11:38:27.440548+00	f
42a94963-592f-48d2-8bde-83ce8a2d786f	\N	Tormoz nakladkasi	120000.00	250000.00	60	t	8a9392d7-3f52-4424-a590-30ffe873ad47	2026-04-19 11:38:27.440548+00	2026-04-19 11:38:27.440548+00	f
42a94963-592f-48d2-8bde-83ce8a2d786f	\N	Shina almashtirish	40000.00	80000.00	20	t	cde94801-12cc-4f90-b353-e9115c26070e	2026-04-19 11:38:27.440549+00	2026-04-19 11:38:27.440549+00	f
42a94963-592f-48d2-8bde-83ce8a2d786f	\N	Konditsioner to'ldirish	60000.00	120000.00	40	t	24a60283-4723-4c48-b7cf-d23e97487c1c	2026-04-19 11:38:27.440549+00	2026-04-19 11:38:27.440549+00	f
42a94963-592f-48d2-8bde-83ce8a2d786f	\N	Akumlyator almashtirish	150000.00	300000.00	30	t	3a0d0660-33b6-400a-bbb0-a35a99d3c3a5	2026-04-19 11:38:27.44055+00	2026-04-19 11:38:27.44055+00	f
27e94db0-c00e-4b90-ba64-98d7219c0f33	\N	Moy almashtirish	80000.00	150000.00	30	t	d3894c0d-b068-46fe-a0fd-d0fca9d1858d	2026-04-19 11:38:27.444421+00	2026-04-19 11:38:27.444423+00	f
27e94db0-c00e-4b90-ba64-98d7219c0f33	\N	Diagnostika	50000.00	100000.00	45	t	0e0953ec-0994-40c6-9771-f577ae269eed	2026-04-19 11:38:27.444424+00	2026-04-19 11:38:27.444424+00	f
27e94db0-c00e-4b90-ba64-98d7219c0f33	\N	Tormoz nakladkasi	120000.00	250000.00	60	t	e1c4c6a4-73da-4c80-b82a-e17bdd59651f	2026-04-19 11:38:27.444424+00	2026-04-19 11:38:27.444425+00	f
27e94db0-c00e-4b90-ba64-98d7219c0f33	\N	Shina almashtirish	40000.00	80000.00	20	t	cc6e6939-59a3-403e-ae6a-83fa728c6938	2026-04-19 11:38:27.444425+00	2026-04-19 11:38:27.444425+00	f
27e94db0-c00e-4b90-ba64-98d7219c0f33	\N	Konditsioner to'ldirish	60000.00	120000.00	40	t	ed557b47-7f15-4931-a0cf-4abb48b5cf91	2026-04-19 11:38:27.444426+00	2026-04-19 11:38:27.444426+00	f
27e94db0-c00e-4b90-ba64-98d7219c0f33	\N	Akumlyator almashtirish	150000.00	300000.00	30	t	0a62503c-d130-452a-a0e8-ad668aaf3e42	2026-04-19 11:38:27.444426+00	2026-04-19 11:38:27.444426+00	f
ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	\N	Moy almashtirish	80000.00	150000.00	30	t	718eb918-cd65-4d5f-b98b-3c08af2b45f9	2026-04-19 11:38:27.447357+00	2026-04-19 11:38:27.447359+00	f
ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	\N	Diagnostika	50000.00	100000.00	45	t	87baa34b-76ea-46d6-9160-d8938454e0ec	2026-04-19 11:38:27.447359+00	2026-04-19 11:38:27.44736+00	f
ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	\N	Tormoz nakladkasi	120000.00	250000.00	60	t	59af5d4d-ebb9-44de-bdd9-77b23d695c6c	2026-04-19 11:38:27.44736+00	2026-04-19 11:38:27.44736+00	f
ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	\N	Shina almashtirish	40000.00	80000.00	20	t	5c0213e7-eebe-4761-903d-27db799334d8	2026-04-19 11:38:27.447361+00	2026-04-19 11:38:27.447361+00	f
ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	\N	Konditsioner to'ldirish	60000.00	120000.00	40	t	8326d4a6-2efc-4dc2-86bb-255221ca2c83	2026-04-19 11:38:27.447361+00	2026-04-19 11:38:27.447361+00	f
ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	\N	Akumlyator almashtirish	150000.00	300000.00	30	t	13055361-6271-43c5-bbec-c1d3f3096490	2026-04-19 11:38:27.447362+00	2026-04-19 11:38:27.447362+00	f
d0157137-b945-482c-aad0-f5b7f57044af	\N	Moy almashtirish	80000.00	150000.00	30	t	6c670c54-1775-4d89-96cb-16d8be0cde0a	2026-04-19 11:38:27.450193+00	2026-04-19 11:38:27.450195+00	f
d0157137-b945-482c-aad0-f5b7f57044af	\N	Diagnostika	50000.00	100000.00	45	t	59c77976-f4c9-4a05-a4ed-0756bfcb79d6	2026-04-19 11:38:27.450195+00	2026-04-19 11:38:27.450196+00	f
d0157137-b945-482c-aad0-f5b7f57044af	\N	Tormoz nakladkasi	120000.00	250000.00	60	t	50a7a8b7-72aa-4e22-a43e-8b7b3a5e873d	2026-04-19 11:38:27.450196+00	2026-04-19 11:38:27.450196+00	f
d0157137-b945-482c-aad0-f5b7f57044af	\N	Shina almashtirish	40000.00	80000.00	20	t	2b24dc19-aeee-4372-bc70-063f88f4c12b	2026-04-19 11:38:27.450197+00	2026-04-19 11:38:27.450197+00	f
d0157137-b945-482c-aad0-f5b7f57044af	\N	Konditsioner to'ldirish	60000.00	120000.00	40	t	c0e7fb94-589b-4a28-86ca-8201d3232dde	2026-04-19 11:38:27.450197+00	2026-04-19 11:38:27.450197+00	f
d0157137-b945-482c-aad0-f5b7f57044af	\N	Akumlyator almashtirish	150000.00	300000.00	30	t	bba2a375-fc58-444f-9c08-4a3a81b5f955	2026-04-19 11:38:27.450198+00	2026-04-19 11:38:27.450198+00	f
b7baeea9-fc4d-4cf9-a469-4916155f40bc	\N	Moy almashtirish	80000.00	150000.00	30	t	c4194da7-f9e8-4709-b39d-0886f6f94a65	2026-04-19 11:38:27.452983+00	2026-04-19 11:38:27.452985+00	f
b7baeea9-fc4d-4cf9-a469-4916155f40bc	\N	Diagnostika	50000.00	100000.00	45	t	dbd9906c-944b-4ea7-8704-a8c5286a4433	2026-04-19 11:38:27.452986+00	2026-04-19 11:38:27.452986+00	f
b7baeea9-fc4d-4cf9-a469-4916155f40bc	\N	Tormoz nakladkasi	120000.00	250000.00	60	t	cb9ea637-a799-4ee9-ba89-2746d25b3682	2026-04-19 11:38:27.452986+00	2026-04-19 11:38:27.452986+00	f
b7baeea9-fc4d-4cf9-a469-4916155f40bc	\N	Shina almashtirish	40000.00	80000.00	20	t	2bff165a-75c1-4606-9508-0824efe590fe	2026-04-19 11:38:27.452987+00	2026-04-19 11:38:27.452987+00	f
b7baeea9-fc4d-4cf9-a469-4916155f40bc	\N	Konditsioner to'ldirish	60000.00	120000.00	40	t	4d7603f3-aba6-4765-b3c1-b7f4b8bcdbaf	2026-04-19 11:38:27.452987+00	2026-04-19 11:38:27.452987+00	f
b7baeea9-fc4d-4cf9-a469-4916155f40bc	\N	Akumlyator almashtirish	150000.00	300000.00	30	t	33944ace-db0b-4243-8af8-98d613bff9b0	2026-04-19 11:38:27.452988+00	2026-04-19 11:38:27.452988+00	f
1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	\N	Moy almashtirish	80000.00	150000.00	30	t	5b99cf83-6200-4670-aaa7-0bf9ecf75d26	2026-04-19 11:38:27.455665+00	2026-04-19 11:38:27.455667+00	f
1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	\N	Diagnostika	50000.00	100000.00	45	t	16a5a063-93d1-4f99-bbef-329339e3e9ba	2026-04-19 11:38:27.455667+00	2026-04-19 11:38:27.455667+00	f
1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	\N	Tormoz nakladkasi	120000.00	250000.00	60	t	e3001fe4-6195-4216-944e-fe4d4d579034	2026-04-19 11:38:27.455668+00	2026-04-19 11:38:27.455668+00	f
1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	\N	Shina almashtirish	40000.00	80000.00	20	t	87cedc8d-6c26-4859-906b-4ba1d865917a	2026-04-19 11:38:27.455668+00	2026-04-19 11:38:27.455669+00	f
1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	\N	Konditsioner to'ldirish	60000.00	120000.00	40	t	43801c7f-eef0-4662-ae2c-e9a2eb952fe5	2026-04-19 11:38:27.455669+00	2026-04-19 11:38:27.455669+00	f
1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	\N	Akumlyator almashtirish	150000.00	300000.00	30	t	17a9c8dc-30ad-4d17-8a21-e8b25ac57f04	2026-04-19 11:38:27.455669+00	2026-04-19 11:38:27.45567+00	f
7a9fc58a-df61-44ad-a3e3-4725f73371a8	\N	Moy almashtirish	80000.00	150000.00	30	t	86607010-ae12-4fb0-b388-314d97a288e8	2026-04-19 11:38:27.458451+00	2026-04-19 11:38:27.458452+00	f
7a9fc58a-df61-44ad-a3e3-4725f73371a8	\N	Diagnostika	50000.00	100000.00	45	t	4f31ff35-a00a-436d-90eb-efb14cfd8b1f	2026-04-19 11:38:27.458453+00	2026-04-19 11:38:27.458453+00	f
7a9fc58a-df61-44ad-a3e3-4725f73371a8	\N	Tormoz nakladkasi	120000.00	250000.00	60	t	3ecae03f-c616-4db0-b97b-82488f079dcf	2026-04-19 11:38:27.458454+00	2026-04-19 11:38:27.458454+00	f
7a9fc58a-df61-44ad-a3e3-4725f73371a8	\N	Shina almashtirish	40000.00	80000.00	20	t	f64357c1-f1b7-4216-aafa-56ab9e6b2b60	2026-04-19 11:38:27.458454+00	2026-04-19 11:38:27.458454+00	f
7a9fc58a-df61-44ad-a3e3-4725f73371a8	\N	Konditsioner to'ldirish	60000.00	120000.00	40	t	4a485ae1-ff3b-4dfe-ad14-34b1c874944f	2026-04-19 11:38:27.458455+00	2026-04-19 11:38:27.458455+00	f
7a9fc58a-df61-44ad-a3e3-4725f73371a8	\N	Akumlyator almashtirish	150000.00	300000.00	30	t	f0e6e2f5-d375-44f6-9365-21056e2ff9ca	2026-04-19 11:38:27.458455+00	2026-04-19 11:38:27.458455+00	f
a3809b36-54fc-4c8f-904e-ef9c1bf67295	\N	Moy almashtirish	80000.00	150000.00	30	t	11b42302-8278-4897-8045-31c09c7af9eb	2026-04-19 11:38:27.461515+00	2026-04-19 11:38:27.461516+00	f
a3809b36-54fc-4c8f-904e-ef9c1bf67295	\N	Diagnostika	50000.00	100000.00	45	t	09124175-236b-4c36-bb9b-1faa261cbc99	2026-04-19 11:38:27.461517+00	2026-04-19 11:38:27.461517+00	f
a3809b36-54fc-4c8f-904e-ef9c1bf67295	\N	Tormoz nakladkasi	120000.00	250000.00	60	t	777f91c3-bd43-451a-8ae2-bf2d15f00154	2026-04-19 11:38:27.461517+00	2026-04-19 11:38:27.461518+00	f
a3809b36-54fc-4c8f-904e-ef9c1bf67295	\N	Shina almashtirish	40000.00	80000.00	20	t	de03bbc3-3a82-4c8a-a051-90b0893a8dc2	2026-04-19 11:38:27.461518+00	2026-04-19 11:38:27.461518+00	f
a3809b36-54fc-4c8f-904e-ef9c1bf67295	\N	Konditsioner to'ldirish	60000.00	120000.00	40	t	78da2899-63a5-445c-be8f-3d0993916e4a	2026-04-19 11:38:27.461518+00	2026-04-19 11:38:27.461519+00	f
a3809b36-54fc-4c8f-904e-ef9c1bf67295	\N	Akumlyator almashtirish	150000.00	300000.00	30	t	c8a9cad6-5e96-49d7-9121-d4831e1b9c9c	2026-04-19 11:38:27.461519+00	2026-04-19 11:38:27.461519+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	\N	Moy almashtirish	80000.00	150000.00	30	t	b6dbf633-04d6-49b2-a159-2857033baec8	2026-04-19 11:38:27.464312+00	2026-04-19 11:38:27.464314+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	\N	Diagnostika	50000.00	100000.00	45	t	de2b06f3-b9b9-459e-ad86-c3185399b0aa	2026-04-19 11:38:27.464314+00	2026-04-19 11:38:27.464314+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	\N	Tormoz nakladkasi	120000.00	250000.00	60	t	8906d902-adee-41bb-843b-3deee078818c	2026-04-19 11:38:27.464315+00	2026-04-19 11:38:27.464315+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	\N	Shina almashtirish	40000.00	80000.00	20	t	a400ab88-5952-4cc9-8f3e-8ab316f75e48	2026-04-19 11:38:27.464316+00	2026-04-19 11:38:27.464316+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	\N	Konditsioner to'ldirish	60000.00	120000.00	40	t	4add3f1c-5173-44e2-8f8c-0d8511b4975a	2026-04-19 11:38:27.464316+00	2026-04-19 11:38:27.464316+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	\N	Akumlyator almashtirish	150000.00	300000.00	30	t	5579ef11-31b4-4f1d-a4af-19b7812a0c29	2026-04-19 11:38:27.464317+00	2026-04-19 11:38:27.464317+00	f
4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	\N	Moy almashtirish	80000.00	150000.00	30	t	e51a6b77-a6ae-49b8-85da-796adacaee96	2026-04-19 11:38:27.466987+00	2026-04-19 11:38:27.466988+00	f
4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	\N	Diagnostika	50000.00	100000.00	45	t	59362b6a-3473-416e-bacd-0c573054435f	2026-04-19 11:38:27.466989+00	2026-04-19 11:38:27.466989+00	f
4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	\N	Tormoz nakladkasi	120000.00	250000.00	60	t	052c0829-7123-4b9b-90c6-a51283fd6206	2026-04-19 11:38:27.466989+00	2026-04-19 11:38:27.466989+00	f
4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	\N	Shina almashtirish	40000.00	80000.00	20	t	c5316a96-9d75-48f8-9347-116b503982fb	2026-04-19 11:38:27.46699+00	2026-04-19 11:38:27.46699+00	f
4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	\N	Konditsioner to'ldirish	60000.00	120000.00	40	t	f2ca935e-7f7a-44ed-bb3b-506a3728278e	2026-04-19 11:38:27.46699+00	2026-04-19 11:38:27.46699+00	f
4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	\N	Akumlyator almashtirish	150000.00	300000.00	30	t	431b95e8-23a8-4edc-8613-5f70d3f7a865	2026-04-19 11:38:27.466991+00	2026-04-19 11:38:27.466991+00	f
\.


--
-- Data for Name: workshop_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workshop_subscriptions (workshop_id, plan_id, starts_at, expires_at, is_active, auto_renew, id, created_at, updated_at, is_deleted) FROM stdin;
a0cc3386-af63-4387-b8ad-7686da70cd9e	bd526f22-2689-4d8d-b453-b3f272a6680b	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	948954d0-2e1c-4a8a-9faf-cc9a395eb32a	2026-04-21 07:55:27.790288+00	2026-04-21 07:55:27.790289+00	f
5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	501cc1be-0cfc-48bf-a0b4-0879479b53b9	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	c3881cca-71ab-4e4f-9894-825f91280997	2026-04-21 07:55:27.79029+00	2026-04-21 07:55:27.79029+00	f
f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	f9f94396-5f8b-4cfd-b833-57d9950d98e5	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	2fd0775d-9419-4074-ba91-a470536acd3d	2026-04-21 07:55:27.790291+00	2026-04-21 07:55:27.790291+00	f
f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	f37909be-dc18-4300-9cf1-f2a1c15f2a48	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	d13738b9-9d10-4538-ad99-4898980ff7b4	2026-04-21 07:55:27.790291+00	2026-04-21 07:55:27.790292+00	f
eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	bd526f22-2689-4d8d-b453-b3f272a6680b	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	883a4f09-0fe0-4fe5-b891-22abf1a32c39	2026-04-21 07:55:27.790292+00	2026-04-21 07:55:27.790292+00	f
42a94963-592f-48d2-8bde-83ce8a2d786f	501cc1be-0cfc-48bf-a0b4-0879479b53b9	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	e21341b2-659c-4f9b-91c5-d419636dc3c9	2026-04-21 07:55:27.790293+00	2026-04-21 07:55:27.790293+00	f
27e94db0-c00e-4b90-ba64-98d7219c0f33	f9f94396-5f8b-4cfd-b833-57d9950d98e5	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	75422ff3-5519-4983-937b-db5c6b3b65ef	2026-04-21 07:55:27.790293+00	2026-04-21 07:55:27.790293+00	f
ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	f37909be-dc18-4300-9cf1-f2a1c15f2a48	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	72f0f810-6c11-4dfa-8380-8b8d1c5fa115	2026-04-21 07:55:27.790294+00	2026-04-21 07:55:27.790294+00	f
d0157137-b945-482c-aad0-f5b7f57044af	bd526f22-2689-4d8d-b453-b3f272a6680b	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	6647807b-0693-4023-92d9-a9b65a692ec2	2026-04-21 07:55:27.790294+00	2026-04-21 07:55:27.790295+00	f
b7baeea9-fc4d-4cf9-a469-4916155f40bc	501cc1be-0cfc-48bf-a0b4-0879479b53b9	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	5a4ed214-71f3-4f57-8d96-37e8c82616ae	2026-04-21 07:55:27.790295+00	2026-04-21 07:55:27.790295+00	f
1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	f9f94396-5f8b-4cfd-b833-57d9950d98e5	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	d49763c4-2c04-4d3a-8a59-b60d4843db97	2026-04-21 07:55:27.790295+00	2026-04-21 07:55:27.790296+00	f
7a9fc58a-df61-44ad-a3e3-4725f73371a8	f37909be-dc18-4300-9cf1-f2a1c15f2a48	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	66f28593-24a1-495e-9688-9ff2aaf70256	2026-04-21 07:55:27.790296+00	2026-04-21 07:55:27.790296+00	f
a3809b36-54fc-4c8f-904e-ef9c1bf67295	bd526f22-2689-4d8d-b453-b3f272a6680b	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	5b7fcd9e-8e69-4a9b-b5f6-b9f2c740105b	2026-04-21 07:55:27.790297+00	2026-04-21 07:55:27.790297+00	f
09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	501cc1be-0cfc-48bf-a0b4-0879479b53b9	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	34b2c23d-b1ed-421f-b39c-8bc6eededb81	2026-04-21 07:55:27.790297+00	2026-04-21 07:55:27.790297+00	f
4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	f9f94396-5f8b-4cfd-b833-57d9950d98e5	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	f60d6570-ef27-40e4-a630-7eb2de16919e	2026-04-21 07:55:27.790298+00	2026-04-21 07:55:27.790298+00	f
c27697c9-9ac9-4e9f-8e3b-5c2519f8983c	f37909be-dc18-4300-9cf1-f2a1c15f2a48	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	83dfae09-0b65-4c0f-8fce-dbab2432ce9c	2026-04-21 07:55:27.790298+00	2026-04-21 07:55:27.790298+00	f
02ed243f-ad3a-4355-95f0-f04b6f28a7c4	bd526f22-2689-4d8d-b453-b3f272a6680b	2026-03-22 07:55:27.789284+00	2027-03-22 07:55:27.789284+00	t	t	7673da54-fa74-4c4d-a5e9-86e9dbb0c9e5	2026-04-21 07:55:27.790299+00	2026-04-21 07:55:27.790299+00	f
\.


--
-- Data for Name: workshops; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workshops (partner_id, name, slug, description, address, city, district, latitude, longitude, phone, working_hours, is_verified, is_active, subscription_tier, rating_avg, total_reviews, id, created_at, updated_at, is_deleted) FROM stdin;
9e1e6568-546b-46a7-93c1-3634b2896dff	Premium Avto Servis	premium-avto-servis	Premium Avto Servis — professional avto ta'mir xizmatlari.	Toshkent, Chilonzor 9-kvartal	Toshkent	Chilonzor	41.2857	69.204	+998901234567	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	4.5	28	a0cc3386-af63-4387-b8ad-7686da70cd9e	2026-04-19 11:38:00.483063+00	2026-04-19 11:38:00.483065+00	f
9e1e6568-546b-46a7-93c1-3634b2896dff	Usta Karim Servis	usta-karim-servis	Usta Karim Servis — professional avto ta'mir xizmatlari.	Toshkent, Yakkasaroy, Shota Rustaveli	Toshkent	Yakkasaroy	41.2995	69.2796	+998901234567	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	4.5	28	5a7689af-1bb8-417b-a4a4-fe5d4594fcf9	2026-04-19 11:38:00.483065+00	2026-04-19 11:38:00.483066+00	f
9e1e6568-546b-46a7-93c1-3634b2896dff	AutoDoc Service	autodoc-service	AutoDoc Service — professional avto ta'mir xizmatlari.	Toshkent, Mirzo Ulug'bek tumani	Toshkent	Mirzo Ulug'bek	41.328	69.334	+998901234567	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	4.5	28	f2fa4da0-8c45-4bf1-b9d7-3542b7aa782b	2026-04-19 11:38:00.483066+00	2026-04-19 11:38:00.483066+00	f
9e1e6568-546b-46a7-93c1-3634b2896dff	Master Auto	master-auto	Master Auto — professional avto ta'mir xizmatlari.	Toshkent, Sergeli tumani	Toshkent	Sergeli	41.225	69.218	+998901234567	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	4.5	28	f5d9328f-7b25-4fdc-b5b4-c1784baeedb4	2026-04-19 11:38:00.483067+00	2026-04-19 11:38:00.483067+00	f
9e1e6568-546b-46a7-93c1-3634b2896dff	Express Avto	express-avto-tamir	Express Avto — professional avto ta'mir xizmatlari.	Toshkent, Shayxontohur tumani	Toshkent	Shayxontohur	41.32	69.25	+998901234567	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	4.5	28	eeda2ec8-cd4d-4ae5-a879-72bbe54a54c6	2026-04-19 11:38:00.483067+00	2026-04-19 11:38:00.483068+00	f
9e1e6568-546b-46a7-93c1-3634b2896dff	Xorazm Avto Servis	xorazm-avto-servis	Xorazm Avto Servis — professional avto ta'mir xizmatlari.	Urganch, Al-Xorazmiy ko'chasi	Urganch	Al-Xorazmiy	41.5513	60.6317	+998901234567	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	4.8	42	42a94963-592f-48d2-8bde-83ce8a2d786f	2026-04-19 11:38:27.433709+00	2026-04-19 11:38:27.433711+00	f
9e1e6568-546b-46a7-93c1-3634b2896dff	Usta Bobur Service	usta-bobur-service	Usta Bobur Service — professional avto ta'mir xizmatlari.	Urganch, Mustaqillik ko'chasi	Urganch	Markaz	41.5534	60.6285	+998901234567	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	4.6	35	27e94db0-c00e-4b90-ba64-98d7219c0f33	2026-04-19 11:38:27.442547+00	2026-04-19 11:38:27.442549+00	f
8485b3d5-3708-43ee-bef3-1595a49643c1	Premium Motor Urganch	premium-motor-urganch	Premium Motor Urganch — professional avto ta'mir xizmatlari.	Urganch, Navoiy ko'chasi	Urganch	Navoiy	41.548	60.635	+998901234567	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	4.9	58	ea61e479-805c-4dd0-9d2a-0b7a9f6dd4b9	2026-04-19 11:38:27.445763+00	2026-04-19 11:38:27.445765+00	f
8485b3d5-3708-43ee-bef3-1595a49643c1	Turbo Avto Xorazm	turbo-avto-xorazm	Turbo Avto Xorazm — professional avto ta'mir xizmatlari.	Urganch, Amir Temur ko'chasi	Urganch	Amir Temur	41.556	60.625	+998901234567	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	4.3	21	d0157137-b945-482c-aad0-f5b7f57044af	2026-04-19 11:38:27.448618+00	2026-04-19 11:38:27.44862+00	f
9e1e6568-546b-46a7-93c1-3634b2896dff	Express Ta'mir Urganch	express-tamir-urganch	Express Ta'mir Urganch — professional avto ta'mir xizmatlari.	Urganch, Beruniy ko'chasi	Urganch	Beruniy	41.5445	60.64	+998901234567	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	4.7	38	b7baeea9-fc4d-4cf9-a469-4916155f40bc	2026-04-19 11:38:27.451363+00	2026-04-19 11:38:27.451364+00	f
8485b3d5-3708-43ee-bef3-1595a49643c1	Xiva Avto Servis	xiva-avto-servis	Xiva Avto Servis — professional avto ta'mir xizmatlari.	Xiva, Ichan Qal'a yonida	Xiva	Markaz	41.3783	60.3639	+998901234567	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	4.5	15	1a01f4cd-7a76-41c0-8f53-0b55f44d9a1b	2026-04-19 11:38:27.454145+00	2026-04-19 11:38:27.454147+00	f
9e1e6568-546b-46a7-93c1-3634b2896dff	Samarqand Auto	samarqand-auto	Samarqand Auto — professional avto ta'mir xizmatlari.	Samarqand, Registon yonida	Samarqand	Markaz	39.6542	66.9597	+998901234567	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	4.4	20	7a9fc58a-df61-44ad-a3e3-4725f73371a8	2026-04-19 11:38:27.456934+00	2026-04-19 11:38:27.456936+00	f
8485b3d5-3708-43ee-bef3-1595a49643c1	Buxoro Usta	buxoro-usta	Buxoro Usta — professional avto ta'mir xizmatlari.	Buxoro, Lyabi Hovuz	Buxoro	Markaz	39.7745	64.4286	+998901234567	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	4.2	12	a3809b36-54fc-4c8f-904e-ef9c1bf67295	2026-04-19 11:38:27.459834+00	2026-04-19 11:38:27.459836+00	f
9e1e6568-546b-46a7-93c1-3634b2896dff	Andijon Servis	andijon-servis	Andijon Servis — professional avto ta'mir xizmatlari.	Andijon, Bobur ko'chasi	Andijon	Markaz	40.7821	72.3442	+998901234567	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	4.6	28	09cd2fda-4d5d-4df9-bf1b-bf07b4ec0525	2026-04-19 11:38:27.462845+00	2026-04-19 11:38:27.462847+00	f
8485b3d5-3708-43ee-bef3-1595a49643c1	Nukus Avto	nukus-avto	Nukus Avto — professional avto ta'mir xizmatlari.	Nukus, Berdax ko'chasi	Nukus	Markaz	42.4619	59.6003	+998901234567	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	4.1	8	4a9ac5a2-68fd-4cd5-accb-225f4c00c6a8	2026-04-19 11:38:27.465587+00	2026-04-19 11:38:27.465589+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	Urganch avto	urganch-avto-989448	ssda	adsd	Urganch		41.54996071897284	60.61579942703248	asd	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	0	0	c27697c9-9ac9-4e9f-8e3b-5c2519f8983c	2026-04-21 07:03:34.60356+00	2026-04-21 07:03:34.603563+00	f
6d6c1e4a-f037-4866-97aa-8fbd9142b835	URGANCH DARITAL	urganch-darital-1b1494		asd	Urganch		41.5533553594173	60.640068054199226	+998905555555	{"fri": "09:00-18:00", "mon": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq", "thu": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00"}	t	t	BASIC	0	0	02ed243f-ad3a-4355-95f0-f04b6f28a7c4	2026-04-21 07:18:47.163263+00	2026-04-21 07:18:47.163266+00	f
\.


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: booking_services booking_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_services
    ADD CONSTRAINT booking_services_pkey PRIMARY KEY (booking_id, service_id);


--
-- Name: booking_status_history booking_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_status_history
    ADD CONSTRAINT booking_status_history_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: cashback_transactions cashback_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashback_transactions
    ADD CONSTRAINT cashback_transactions_pkey PRIMARY KEY (id);


--
-- Name: cashback_wallets cashback_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashback_wallets
    ADD CONSTRAINT cashback_wallets_pkey PRIMARY KEY (id);


--
-- Name: complaints complaints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_pkey PRIMARY KEY (id);


--
-- Name: escrows escrows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrows
    ADD CONSTRAINT escrows_pkey PRIMARY KEY (id);


--
-- Name: favorite_workshops favorite_workshops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_workshops
    ADD CONSTRAINT favorite_workshops_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: otp_codes otp_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT otp_codes_pkey PRIMARY KEY (id);


--
-- Name: part_bonus_transactions part_bonus_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_bonus_transactions
    ADD CONSTRAINT part_bonus_transactions_pkey PRIMARY KEY (id);


--
-- Name: part_bonus_wallets part_bonus_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_bonus_wallets
    ADD CONSTRAINT part_bonus_wallets_pkey PRIMARY KEY (id);


--
-- Name: part_brands part_brands_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_brands
    ADD CONSTRAINT part_brands_name_key UNIQUE (name);


--
-- Name: part_brands part_brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_brands
    ADD CONSTRAINT part_brands_pkey PRIMARY KEY (id);


--
-- Name: part_categories part_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_categories
    ADD CONSTRAINT part_categories_pkey PRIMARY KEY (id);


--
-- Name: part_inventories part_inventories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_inventories
    ADD CONSTRAINT part_inventories_pkey PRIMARY KEY (id);


--
-- Name: part_order_items part_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_order_items
    ADD CONSTRAINT part_order_items_pkey PRIMARY KEY (id);


--
-- Name: part_orders part_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_orders
    ADD CONSTRAINT part_orders_pkey PRIMARY KEY (id);


--
-- Name: part_prices part_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_prices
    ADD CONSTRAINT part_prices_pkey PRIMARY KEY (id);


--
-- Name: part_vehicle_models part_vehicle_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_vehicle_models
    ADD CONSTRAINT part_vehicle_models_pkey PRIMARY KEY (part_id, vehicle_model_id);


--
-- Name: parts parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parts
    ADD CONSTRAINT parts_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payouts payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: service_categories service_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_pkey PRIMARY KEY (id);


--
-- Name: service_tags service_tags_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tags
    ADD CONSTRAINT service_tags_name_key UNIQUE (name);


--
-- Name: service_tags service_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tags
    ADD CONSTRAINT service_tags_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: time_slots time_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_slots
    ADD CONSTRAINT time_slots_pkey PRIMARY KEY (id);


--
-- Name: favorite_workshops uq_favorite_user_workshop; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_workshops
    ADD CONSTRAINT uq_favorite_user_workshop UNIQUE (user_id, workshop_id);


--
-- Name: user_vehicles user_vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_vehicles
    ADD CONSTRAINT user_vehicles_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicle_brands vehicle_brands_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_brands
    ADD CONSTRAINT vehicle_brands_name_key UNIQUE (name);


--
-- Name: vehicle_brands vehicle_brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_brands
    ADD CONSTRAINT vehicle_brands_pkey PRIMARY KEY (id);


--
-- Name: vehicle_models vehicle_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_models
    ADD CONSTRAINT vehicle_models_pkey PRIMARY KEY (id);


--
-- Name: warranties warranties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranties
    ADD CONSTRAINT warranties_pkey PRIMARY KEY (id);


--
-- Name: warranty_claims warranty_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranty_claims
    ADD CONSTRAINT warranty_claims_pkey PRIMARY KEY (id);


--
-- Name: workshop_certificates workshop_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop_certificates
    ADD CONSTRAINT workshop_certificates_pkey PRIMARY KEY (id);


--
-- Name: workshop_photos workshop_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop_photos
    ADD CONSTRAINT workshop_photos_pkey PRIMARY KEY (id);


--
-- Name: workshop_schedules workshop_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop_schedules
    ADD CONSTRAINT workshop_schedules_pkey PRIMARY KEY (id);


--
-- Name: workshop_services workshop_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop_services
    ADD CONSTRAINT workshop_services_pkey PRIMARY KEY (id);


--
-- Name: workshop_subscriptions workshop_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop_subscriptions
    ADD CONSTRAINT workshop_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: workshops workshops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshops
    ADD CONSTRAINT workshops_pkey PRIMARY KEY (id);


--
-- Name: ix_audit_logs_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_admin_id ON public.audit_logs USING btree (admin_id);


--
-- Name: ix_booking_status_history_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_booking_status_history_booking_id ON public.booking_status_history USING btree (booking_id);


--
-- Name: ix_bookings_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_bookings_customer_id ON public.bookings USING btree (customer_id);


--
-- Name: ix_bookings_workshop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_bookings_workshop_id ON public.bookings USING btree (workshop_id);


--
-- Name: ix_cashback_transactions_wallet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cashback_transactions_wallet_id ON public.cashback_transactions USING btree (wallet_id);


--
-- Name: ix_cashback_wallets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_cashback_wallets_user_id ON public.cashback_wallets USING btree (user_id);


--
-- Name: ix_complaints_complainant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_complaints_complainant_id ON public.complaints USING btree (complainant_id);


--
-- Name: ix_escrows_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_escrows_payment_id ON public.escrows USING btree (payment_id);


--
-- Name: ix_escrows_workshop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_escrows_workshop_id ON public.escrows USING btree (workshop_id);


--
-- Name: ix_favorite_workshops_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_favorite_workshops_user_id ON public.favorite_workshops USING btree (user_id);


--
-- Name: ix_favorite_workshops_workshop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_favorite_workshops_workshop_id ON public.favorite_workshops USING btree (workshop_id);


--
-- Name: ix_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: ix_otp_codes_user_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_otp_codes_user_phone ON public.otp_codes USING btree (user_phone);


--
-- Name: ix_part_bonus_transactions_wallet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_part_bonus_transactions_wallet_id ON public.part_bonus_transactions USING btree (wallet_id);


--
-- Name: ix_part_bonus_wallets_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_part_bonus_wallets_partner_id ON public.part_bonus_wallets USING btree (partner_id);


--
-- Name: ix_part_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_part_categories_slug ON public.part_categories USING btree (slug);


--
-- Name: ix_part_inventories_part_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_part_inventories_part_id ON public.part_inventories USING btree (part_id);


--
-- Name: ix_part_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_part_order_items_order_id ON public.part_order_items USING btree (order_id);


--
-- Name: ix_part_order_items_part_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_part_order_items_part_id ON public.part_order_items USING btree (part_id);


--
-- Name: ix_part_orders_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_part_orders_booking_id ON public.part_orders USING btree (booking_id);


--
-- Name: ix_part_orders_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_part_orders_customer_id ON public.part_orders USING btree (customer_id);


--
-- Name: ix_part_orders_workshop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_part_orders_workshop_id ON public.part_orders USING btree (workshop_id);


--
-- Name: ix_part_prices_part_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_part_prices_part_id ON public.part_prices USING btree (part_id);


--
-- Name: ix_parts_brand_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_parts_brand_id ON public.parts USING btree (brand_id);


--
-- Name: ix_parts_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_parts_category_id ON public.parts USING btree (category_id);


--
-- Name: ix_parts_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_parts_sku ON public.parts USING btree (sku);


--
-- Name: ix_payments_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_payments_booking_id ON public.payments USING btree (booking_id);


--
-- Name: ix_payouts_workshop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_payouts_workshop_id ON public.payouts USING btree (workshop_id);


--
-- Name: ix_platform_settings_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_platform_settings_key ON public.platform_settings USING btree (key);


--
-- Name: ix_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: ix_reviews_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_reviews_booking_id ON public.reviews USING btree (booking_id);


--
-- Name: ix_reviews_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reviews_customer_id ON public.reviews USING btree (customer_id);


--
-- Name: ix_reviews_workshop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reviews_workshop_id ON public.reviews USING btree (workshop_id);


--
-- Name: ix_service_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_service_categories_slug ON public.service_categories USING btree (slug);


--
-- Name: ix_subscription_plans_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_subscription_plans_tier ON public.subscription_plans USING btree (tier);


--
-- Name: ix_time_slots_workshop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_time_slots_workshop_id ON public.time_slots USING btree (workshop_id);


--
-- Name: ix_user_vehicles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_vehicles_user_id ON public.user_vehicles USING btree (user_id);


--
-- Name: ix_users_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_phone ON public.users USING btree (phone);


--
-- Name: ix_vehicle_models_brand_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vehicle_models_brand_id ON public.vehicle_models USING btree (brand_id);


--
-- Name: ix_warranties_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_warranties_booking_id ON public.warranties USING btree (booking_id);


--
-- Name: ix_warranties_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_warranties_customer_id ON public.warranties USING btree (customer_id);


--
-- Name: ix_warranties_workshop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_warranties_workshop_id ON public.warranties USING btree (workshop_id);


--
-- Name: ix_warranty_claims_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_warranty_claims_customer_id ON public.warranty_claims USING btree (customer_id);


--
-- Name: ix_warranty_claims_warranty_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_warranty_claims_warranty_id ON public.warranty_claims USING btree (warranty_id);


--
-- Name: ix_workshop_certificates_workshop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_workshop_certificates_workshop_id ON public.workshop_certificates USING btree (workshop_id);


--
-- Name: ix_workshop_photos_workshop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_workshop_photos_workshop_id ON public.workshop_photos USING btree (workshop_id);


--
-- Name: ix_workshop_schedules_workshop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_workshop_schedules_workshop_id ON public.workshop_schedules USING btree (workshop_id);


--
-- Name: ix_workshop_services_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_workshop_services_category_id ON public.workshop_services USING btree (category_id);


--
-- Name: ix_workshop_services_workshop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_workshop_services_workshop_id ON public.workshop_services USING btree (workshop_id);


--
-- Name: ix_workshop_subscriptions_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_workshop_subscriptions_plan_id ON public.workshop_subscriptions USING btree (plan_id);


--
-- Name: ix_workshop_subscriptions_workshop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_workshop_subscriptions_workshop_id ON public.workshop_subscriptions USING btree (workshop_id);


--
-- Name: ix_workshops_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_workshops_partner_id ON public.workshops USING btree (partner_id);


--
-- Name: ix_workshops_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_workshops_slug ON public.workshops USING btree (slug);


--
-- Name: audit_logs audit_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id);


--
-- Name: booking_services booking_services_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_services
    ADD CONSTRAINT booking_services_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: booking_services booking_services_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_services
    ADD CONSTRAINT booking_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.workshop_services(id);


--
-- Name: booking_status_history booking_status_history_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_status_history
    ADD CONSTRAINT booking_status_history_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: bookings bookings_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id);


--
-- Name: bookings bookings_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.user_vehicles(id);


--
-- Name: bookings bookings_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id);


--
-- Name: cashback_transactions cashback_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashback_transactions
    ADD CONSTRAINT cashback_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.cashback_wallets(id);


--
-- Name: cashback_wallets cashback_wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashback_wallets
    ADD CONSTRAINT cashback_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: complaints complaints_against_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_against_id_fkey FOREIGN KEY (against_id) REFERENCES public.users(id);


--
-- Name: complaints complaints_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: complaints complaints_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: complaints complaints_complainant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_complainant_id_fkey FOREIGN KEY (complainant_id) REFERENCES public.users(id);


--
-- Name: complaints complaints_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id);


--
-- Name: escrows escrows_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrows
    ADD CONSTRAINT escrows_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);


--
-- Name: escrows escrows_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escrows
    ADD CONSTRAINT escrows_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id);


--
-- Name: favorite_workshops favorite_workshops_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_workshops
    ADD CONSTRAINT favorite_workshops_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: favorite_workshops favorite_workshops_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_workshops
    ADD CONSTRAINT favorite_workshops_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: part_bonus_transactions part_bonus_transactions_part_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_bonus_transactions
    ADD CONSTRAINT part_bonus_transactions_part_order_id_fkey FOREIGN KEY (part_order_id) REFERENCES public.part_orders(id);


--
-- Name: part_bonus_transactions part_bonus_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_bonus_transactions
    ADD CONSTRAINT part_bonus_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.part_bonus_wallets(id);


--
-- Name: part_bonus_wallets part_bonus_wallets_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_bonus_wallets
    ADD CONSTRAINT part_bonus_wallets_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.users(id);


--
-- Name: part_categories part_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_categories
    ADD CONSTRAINT part_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.part_categories(id);


--
-- Name: part_inventories part_inventories_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_inventories
    ADD CONSTRAINT part_inventories_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id);


--
-- Name: part_order_items part_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_order_items
    ADD CONSTRAINT part_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.part_orders(id);


--
-- Name: part_order_items part_order_items_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_order_items
    ADD CONSTRAINT part_order_items_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id);


--
-- Name: part_orders part_orders_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_orders
    ADD CONSTRAINT part_orders_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: part_orders part_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_orders
    ADD CONSTRAINT part_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id);


--
-- Name: part_orders part_orders_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_orders
    ADD CONSTRAINT part_orders_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id);


--
-- Name: part_prices part_prices_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_prices
    ADD CONSTRAINT part_prices_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id);


--
-- Name: part_vehicle_models part_vehicle_models_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_vehicle_models
    ADD CONSTRAINT part_vehicle_models_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id);


--
-- Name: part_vehicle_models part_vehicle_models_vehicle_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.part_vehicle_models
    ADD CONSTRAINT part_vehicle_models_vehicle_model_id_fkey FOREIGN KEY (vehicle_model_id) REFERENCES public.vehicle_models(id);


--
-- Name: parts parts_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parts
    ADD CONSTRAINT parts_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.part_brands(id);


--
-- Name: parts parts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parts
    ADD CONSTRAINT parts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.part_categories(id);


--
-- Name: payments payments_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: payouts payouts_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id);


--
-- Name: platform_settings platform_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: reviews reviews_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id);


--
-- Name: service_categories service_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.service_categories(id);


--
-- Name: time_slots time_slots_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_slots
    ADD CONSTRAINT time_slots_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id);


--
-- Name: user_vehicles user_vehicles_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_vehicles
    ADD CONSTRAINT user_vehicles_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.vehicle_brands(id);


--
-- Name: user_vehicles user_vehicles_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_vehicles
    ADD CONSTRAINT user_vehicles_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.vehicle_models(id);


--
-- Name: user_vehicles user_vehicles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_vehicles
    ADD CONSTRAINT user_vehicles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: vehicle_models vehicle_models_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_models
    ADD CONSTRAINT vehicle_models_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.vehicle_brands(id);


--
-- Name: warranties warranties_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranties
    ADD CONSTRAINT warranties_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: warranties warranties_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranties
    ADD CONSTRAINT warranties_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id);


--
-- Name: warranties warranties_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranties
    ADD CONSTRAINT warranties_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id);


--
-- Name: warranty_claims warranty_claims_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranty_claims
    ADD CONSTRAINT warranty_claims_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id);


--
-- Name: warranty_claims warranty_claims_warranty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warranty_claims
    ADD CONSTRAINT warranty_claims_warranty_id_fkey FOREIGN KEY (warranty_id) REFERENCES public.warranties(id);


--
-- Name: workshop_certificates workshop_certificates_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop_certificates
    ADD CONSTRAINT workshop_certificates_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id);


--
-- Name: workshop_photos workshop_photos_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop_photos
    ADD CONSTRAINT workshop_photos_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id);


--
-- Name: workshop_schedules workshop_schedules_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop_schedules
    ADD CONSTRAINT workshop_schedules_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id);


--
-- Name: workshop_services workshop_services_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop_services
    ADD CONSTRAINT workshop_services_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(id);


--
-- Name: workshop_services workshop_services_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop_services
    ADD CONSTRAINT workshop_services_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id);


--
-- Name: workshop_subscriptions workshop_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop_subscriptions
    ADD CONSTRAINT workshop_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: workshop_subscriptions workshop_subscriptions_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop_subscriptions
    ADD CONSTRAINT workshop_subscriptions_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id);


--
-- Name: workshops workshops_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshops
    ADD CONSTRAINT workshops_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

-- unrestrict directive removed for compatibility

