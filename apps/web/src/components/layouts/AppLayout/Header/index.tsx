'use client'

import { ReactNode } from 'react'

import { Icon, SessionUser, Text } from '@latitude-data/web-ui'
import { ROUTES } from '$/services/routes'
import Link from 'next/link'
// TODO: Review dark mode before enabling
// import { ThemeButton } from '$/components/ThemeButton'
import { Fragment } from 'react/jsx-runtime'

import AvatarDropdown from './AvatarDropdown'
import { UsageIndicator } from './UsageIndicator'

function BreadcrumbSeparator() {
  return (
    <svg
      width={12}
      height={18}
      fill='none'
      className='stroke-current text-muted-foreground'
    >
      <path
        strokeLinecap='round'
        strokeWidth={2}
        d='M1 17 11 1'
        opacity={0.5}
      />
    </svg>
  )
}

type IBreadCrumb = {
  name: string | ReactNode
}

export function Breadcrumb({
  breadcrumbs,
  showLogo = false,
}: {
  breadcrumbs: IBreadCrumb[]
  showLogo?: boolean
}) {
  return (
    <ul className='flex flex-row items-center gap-x-4'>
      {showLogo ? (
        <li>
          <Link
            href={ROUTES.dashboard.root}
            className='flex flex-row items-center gap-x-4'
          >
            <Icon name='logo' size='large' />
            <BreadcrumbSeparator />
          </Link>
        </li>
      ) : null}
      {breadcrumbs.map((breadcrumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1
        return (
          <Fragment key={idx}>
            <li>
              {typeof breadcrumb.name === 'string' ? (
                <Text.H5 color='foregroundMuted'>
                  {breadcrumb.name as string}
                </Text.H5>
              ) : (
                breadcrumb.name
              )}
            </li>
            {!isLast ? (
              <li>
                <BreadcrumbSeparator />
              </li>
            ) : null}
          </Fragment>
        )
      })}
    </ul>
  )
}
type INavigationLink = {
  label: string
  href?: string
  index?: boolean
  onClick?: () => void
  _target?: '_blank' | '_self'
}

function NavLink({ label, href, onClick, _target }: INavigationLink) {
  return (
    <Text.H5 asChild>
      <a href={href} onClick={onClick} target={_target}>
        {label}
      </a>
    </Text.H5>
  )
}

export type AppHeaderProps = {
  navigationLinks: INavigationLink[]
  currentUser: SessionUser | undefined
  breadcrumbs?: IBreadCrumb[]
}
export default function AppHeader({
  breadcrumbs = [],
  navigationLinks,
  currentUser,
}: AppHeaderProps) {
  return (
    <header className='px-6 sticky top-0 flex flex-col bg-background-gray border-b border-b-border'>
      <div className='py-3 flex flex-row items-center justify-between'>
        <Breadcrumb showLogo breadcrumbs={breadcrumbs} />
        <div className='flex flex-row items-center gap-x-6'>
          <nav className='flex flex-row gap-x-4 items-center'>
            <UsageIndicator />
            {navigationLinks.map((link, idx) => (
              <NavLink key={idx} {...link} />
            ))}
          </nav>
          <AvatarDropdown currentUser={currentUser} />
          {/* <ThemeButton /> Not good enough for Cesar */}
        </div>
      </div>
    </header>
  )
}
