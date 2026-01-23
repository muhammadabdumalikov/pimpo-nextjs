"use client";

import React, { useState, useEffect } from "react";
import { MenuPermission, SubscriptionTier } from "@/types/subscription";
import { defaultMenuPermissions, getMenuPermissions, saveMenuPermissions, isMenuAllowed } from "@/data/menuPermissions";
import { useSubscription } from "@/context/SubscriptionContext";
import { useTranslations } from "@/hooks/useTranslations";
import Badge from "../ui/badge/Badge";

// Menu structure matching AppSidebar
const menuStructure = [
  { id: 'dashboard.ecommerce', label: 'Dashboard > Ecommerce', category: 'Dashboard' },
  { id: 'ecommerce.products', label: 'E-commerce > Products', category: 'E-commerce' },
  { id: 'ecommerce.addProduct', label: 'E-commerce > Add Product', category: 'E-commerce' },
  { id: 'userDebt', label: 'User Debt', category: 'Main' },
  { id: 'calendar', label: 'Calendar', category: 'Main' },
  { id: 'userProfile', label: 'User Profile', category: 'Main' },
  { id: 'subscriptionManagement', label: 'Subscription Management', category: 'Main' },
  { id: 'forms.formElements', label: 'Forms > Form Elements', category: 'Forms' },
  { id: 'tables.basicTables', label: 'Tables > Basic Tables', category: 'Tables' },
  { id: 'pages.blankPage', label: 'Pages > Blank Page', category: 'Pages' },
  { id: 'pages.error404', label: 'Pages > 404 Error', category: 'Pages' },
  { id: 'charts.lineChart', label: 'Charts > Line Chart', category: 'Charts' },
  { id: 'charts.barChart', label: 'Charts > Bar Chart', category: 'Charts' },
  { id: 'uiElements.alerts', label: 'UI Elements > Alerts', category: 'UI Elements' },
  { id: 'uiElements.avatar', label: 'UI Elements > Avatar', category: 'UI Elements' },
  { id: 'uiElements.badge', label: 'UI Elements > Badge', category: 'UI Elements' },
  { id: 'uiElements.buttons', label: 'UI Elements > Buttons', category: 'UI Elements' },
  { id: 'uiElements.images', label: 'UI Elements > Images', category: 'UI Elements' },
  { id: 'uiElements.videos', label: 'UI Elements > Videos', category: 'UI Elements' },
  { id: 'authentication.signIn', label: 'Authentication > Sign In', category: 'Authentication' },
  { id: 'authentication.signUp', label: 'Authentication > Sign Up', category: 'Authentication' },
];

const subscriptionTiers: SubscriptionTier[] = ['free', 'basic', 'pro'];

export default function SubscriptionManagement() {
  const { t } = useTranslations();
  const { currentTier, setCurrentTier } = useSubscription();
  const [permissions, setPermissions] = useState<MenuPermission[]>(defaultMenuPermissions);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const loaded = getMenuPermissions();
    setPermissions(loaded);
  }, []);

  const togglePermission = (menuItem: string, tier: SubscriptionTier) => {
    setPermissions(prev => {
      const updated = prev.map(p => {
        if (p.menuItem === menuItem) {
          const allowedTiers = p.allowedTiers.includes(tier)
            ? p.allowedTiers.filter(t => t !== tier)
            : [...p.allowedTiers, tier];
          return { ...p, allowedTiers };
        }
        return p;
      });
      setHasChanges(true);
      return updated;
    });
  };

  const handleSave = () => {
    saveMenuPermissions(permissions);
    setHasChanges(false);
    alert('Menu permissions saved successfully!');
  };

  const handleReset = () => {
    setPermissions(defaultMenuPermissions);
    setHasChanges(true);
  };

  const groupedMenus = menuStructure.reduce((acc, menu) => {
    if (!acc[menu.category]) {
      acc[menu.category] = [];
    }
    acc[menu.category].push(menu);
    return acc;
  }, {} as Record<string, typeof menuStructure>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
              Subscription Management
            </h3>
            <p className="text-gray-500 text-theme-sm dark:text-gray-400">
              Configure which menu items are available for each subscription tier.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={currentTier}
              onChange={(e) => setCurrentTier(e.target.value as SubscriptionTier)}
              className="h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
            >
              {subscriptionTiers.map(tier => (
                <option key={tier} value={tier} className="text-gray-700 dark:bg-gray-900 dark:text-gray-400">
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </option>
              ))}
            </select>
            <Badge color={currentTier === 'free' ? 'info' : currentTier === 'basic' ? 'primary' : currentTier === 'pro' ? 'success' : 'warning'}>
              Current: {currentTier}
            </Badge>
          </div>
        </div>
      </div>

      {/* Menu Permissions Table */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-lg font-medium text-gray-800 dark:text-white">
            Menu Permissions
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Menu Item
                </th>
                {subscriptionTiers.map(tier => (
                  <th key={tier} className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {Object.entries(groupedMenus).map(([category, menus]) => (
                <React.Fragment key={category}>
                  <tr className="bg-gray-50 dark:bg-white/[0.02]">
                    <td colSpan={5} className="px-6 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {category}
                    </td>
                  </tr>
                  {menus.map(menu => {
                    const permission = permissions.find(p => p.menuItem === menu.id) || {
                      menuItem: menu.id,
                      allowedTiers: []
                    };
                    return (
                      <tr key={menu.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <td className="px-6 py-3 text-sm text-gray-800 dark:text-white/90">
                          {menu.label}
                        </td>
                        {subscriptionTiers.map(tier => {
                          const isAllowed = permission.allowedTiers.includes(tier);
                          return (
                            <td key={tier} className="px-6 py-3 text-center">
                              <label className="cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isAllowed}
                                  onChange={() => togglePermission(menu.id, tier)}
                                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900"
                                />
                              </label>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      {hasChanges && (
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={handleReset}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
