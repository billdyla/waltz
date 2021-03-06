/*
 * Waltz - Enterprise Architecture
 * Copyright (C) 2016, 2017  Waltz open source project
 * See README.md for more information
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { CORE_API } from '../../../common/services/core-api-utils';
import { initialiseData } from '../../../common';
import { indexRatingSchemes } from '../../../ratings/rating-utils';


import template from './assessment-rating-editor.html';


const bindings = {
    parentEntityRef: '<',
};


const initialState = {
    assessmentDefinitions: [],
    assessmentRatings: [],
    ratingSchemes: [],
};


function mkEnrichedAssessmentDefinitions(assessmentDefinitions, ratingSchemes, assessmentRatings) {
    const ratingSchemesByIdByItemId = indexRatingSchemes(ratingSchemes);
    const ratingsByDefinitionId = _.keyBy(assessmentRatings, 'assessmentDefinitionId');

    return _.map(assessmentDefinitions, d => {
        const ratingScheme = _.get(ratingSchemesByIdByItemId, `[${d.ratingSchemeId}]`);
        const rating = _.get(ratingsByDefinitionId, `[${d.id}]`, null);
        const ratingItem = rating != null
            ? _.get(ratingScheme, `ratingsById[${rating.ratingId}]`)
            : null;

        const dropdownEntries = _.map(ratingScheme.ratings, r => Object.assign({}, {name: r.name, code: r.id, position: r.position}));
        return Object.assign({}, d, { rating, ratingItem, dropdownEntries });
    });
}


function controller($q, serviceBroker) {
    const vm = initialiseData(this, initialState);

    const loadAll = (force = false) => {
        const definitionsPromise = serviceBroker
            .loadViewData(CORE_API.AssessmentDefinitionStore.findByKind, [vm.parentEntityRef.kind]);

        const ratingsPromise = serviceBroker
            .loadViewData(CORE_API.AssessmentRatingStore.findForEntityReference, [vm.parentEntityRef], { force });

        const ratingSchemePromise = serviceBroker.loadViewData(CORE_API.RatingSchemeStore.findAll);

        $q.all([definitionsPromise, ratingsPromise, ratingSchemePromise])
            .then(([r1, r2, r3]) => ([r1.data, r2.data, r3.data]))
            .then(([definitions, ratings, ratingSchemes]) => {
                vm.assessmentDefinitions = definitions;
                vm.assessmentRatings = ratings;
                vm.ratingSchemes = ratingSchemes;

                vm.enrichedAssessmentDefinitions = mkEnrichedAssessmentDefinitions(vm.assessmentDefinitions, vm.ratingSchemes, vm.assessmentRatings);
            });
    };


    vm.$onInit = () => {
        loadAll();
    };


    vm.onRatingEdit = (value, comments, ctx) => {
        let savePromise = $q.when();
        if(ctx.rating != null) {
            //update
            savePromise = serviceBroker.execute(CORE_API.AssessmentRatingStore.update, [vm.parentEntityRef, ctx.id, value, comments]);
        } else {
            //create
            savePromise = serviceBroker.execute(CORE_API.AssessmentRatingStore.create, [vm.parentEntityRef, ctx.id, value, comments]);
        }
        return savePromise
            .then(() => loadAll(true))
    };
}


controller.$inject = [
    '$q',
    'ServiceBroker'
];


const component = {
    template,
    bindings,
    controller
};


export default {
    component,
    id: 'waltzAssessmentRatingEditor'
};
